# DealFlow360 backend — study notes for final review

Product: **DealFlow360**. Decision brain: **D.I.C.E.** (Deal Intelligence & Control Engine) inside `quotation-service`. **OEEG** only emulates Odoo events; it is not intelligence.

This document is a talking script plus a map of the code. API details: `docs/api-gateway-catalog.md`. Local start: `./start-all.sh`.

---

## 1. One-minute pitch (say this first)

We built a **quote-to-cash control plane** for B2B sales.

1. A sales rep builds a quote (lines, customer-specific prices, discounts).
2. **D.I.C.E.** scores risk against admin policy (tier ceilings, margin floor, deal value).
3. Clean quotes **auto-approve**. Borderline quotes auto-approve but are **flagged for post-hoc audit**. Risky quotes enter a **human chain** (Sales Manager, then Finance if needed).
4. The customer can accept or counter. A counter **invalidates** prior approval (stage → `NEGOTIATION`).
5. On order, **deal-engine** snapshots the quote. **Fulfillment** proposes warehouse splits; **inventory** reserves with locking so we do not oversell. Optional **OEEG** fires Odoo-shaped events so we can demo ERP reactions without a live Odoo.

The browser never talks to Java ports. **Nginx `:80`** (prod-style) or **Vite `:5173`** (dev) → **Fastify gateway `:8000`** (JWT, RBAC, envelopes) → services.

---

## 2. System topology

```
Browser (SPA :5173 / Nginx :80)
        │
        ▼
Fastify API gateway :8000     Redis (rate-limit / cache)
        │
        ├── login :8080                 identity, admin catalog
        ├── quotation-service :8082     quotes + D.I.C.E. (canonical brain)
        ├── deal-engine :8083           deal snapshot → order
        ├── governance-engine :8084     persists D.I.C.E. decision as evaluation
        ├── approval-engine :8085       Node; version-hash approval stamps
        ├── negotiation-engine :8086    Node; comments / counters
        ├── inventory-engine :8087      stock, reserve, backorder
        ├── fulfillment-engine :8088    warehouse split plans
        ├── recommendation-engine :8089 Node rank helper
        ├── deal-health-engine :8090    Node read-model dashboard
        ├── billing-engine :8091        Node invoices / subscriptions
        ├── oeeg :8092                  Odoo event emulator
        ├── data-service :8093          SQL + tasks for Node engines
        └── mailer :4000                password reset (not on public gateway)

PostgreSQL :5433  database `dealflow`
  Java: JDBC + Hibernate (ddl-auto=update)
  Node: POST data-service /internal/sql  (do not open Postgres themselves)
```

Compose (`docker-compose.yml`) runs **postgres + redis + data-service + gateway + nginx**. Java/Node engines are started by `start-all.sh` on the host so you can iterate without rebuilding images.

---

## 3. Shared design rules (judges will ask)

| Rule | How we implemented it |
|---|---|
| One decision brain | `DiceEngine` in quotation-service. Governance **fetches** that decision; it does not re-score. |
| OEEG ≠ D.I.C.E. | OEEG **emits**. Quotation webhook **ingests**. Live Odoo JSON-RPC only if `DICE_ODOO_ENABLED=true`. |
| Server-owned lifecycle | `PipelineStage.canTransitionTo` in Java. The Kanban cannot invent a move. |
| JWT everywhere | Login issues access JWT (15 min) + httpOnly refresh cookie. Other services verify the **same** `app.jwt.secret`. |
| Customer isolation | JWT `customerId` claim. List/get forced to that customer. Margin and risk stripped in `sanitizeForCustomer`. |
| Shared schema | `data-service/sql/schema.sql` is the contract. Hibernate snake_case maps onto it. |
| Gateway is the front door | JWT verify, coarse RBAC, request-id, rate-limit, OpenAPI `/documentation`. Do not put Nginx between gateway and Java. |

Roles: `ADMIN`, `SALES_MANAGER`, `SALES_REP`, `FINANCE`, `CUSTOMER`.

---

## 4. Quote pipeline (memorize)

```
DRAFT → PENDING_APPROVAL → NEGOTIATION → APPROVED → ORDERED → FULFILLMENT → COMPLETED
```

Legal transitions live in `PipelineStage`:

| From | Allowed to |
|---|---|
| DRAFT | PENDING_APPROVAL, NEGOTIATION |
| PENDING_APPROVAL | NEGOTIATION, APPROVED, DRAFT |
| NEGOTIATION | PENDING_APPROVAL, APPROVED |
| APPROVED | ORDERED, NEGOTIATION |
| ORDERED | FULFILLMENT |
| FULFILLMENT | COMPLETED |

**Submit for approval** (`transition` to `PENDING_APPROVAL` or customer confirm):

1. `DiceEngine.evaluate(quote)`.
2. Every reason is written as an audit row (`action = DICE`).
3. If `autoApprove`: stage → `APPROVED`, status `AUTO_APPROVED`. If customer already accepted → `ORDERED` and **open + convert deal** in the same transaction (rollback if deal-engine fails).
4. Else: stage → `PENDING_APPROVAL`, build `approval_step` chain (`Sales Manager` and optionally `Finance`).

**Approve / reject / return** on quotation-service: next pending step must match role (`ADMIN` can always act). Full chain → `APPROVED`. Reject/return → `DRAFT`.

**Counter-discount**: legal on live quotes. Moves to `NEGOTIATION`, clears local approval steps, clears `customerAccepted`. That is how a prior approval becomes stale (approval-engine version hash no longer matches).

---

## 5. D.I.C.E. — what to explain on a whiteboard

File: `quotation-service/.../service/DiceEngine.java`  
Policy numbers: `ThresholdConfig` + table `governance_threshold` (5s cache; DB overrides compiled defaults).

### Inputs

- Quote lines (discount %, subtotal, margin)
- Customer **tier** (Bronze / Silver / Gold / Platinum)
- Product **category**
- Admin **discount_rule** ceilings (tier + category); else default ladder
- Thresholds: auto-approve risk **40**, margin floor **20%**, finance deal value **₹50L**, blended overage finance **8 pts**, anomaly discount **25%**, audit band **10** points below the auto line

### Scoring (order of operations)

1. **Baseline**: overall discount % × 1.2 → risk.
2. **Category blend**: per category, value-weighted average discount vs ceiling. Overage × 2 → risk. Breach requires at least **Sales Manager**. Service categories are stricter (cap 10%).
3. **Margin floor**: if gross margin < 20%, add deficit × 1.5, require **Finance**.
4. **Deal value**: total > ₹50L → +15 risk, **Finance**.
5. **Blended finance**: stacked category overages ≥ 8 pts → **Finance**.
6. **Discount anomaly**: overall ≥ 25% → +10 risk, **Sales Manager**.
7. **Risk threshold**: if score ≥ 40 and no level yet → **Sales Manager**.
8. **Gold/Platinum fast-track**: no ceiling breach, overall discount < 10%, healthy margin, under finance authority → force auto-approve and clear required level.

### Outputs (`Decision`)

- `riskScore` (capped 100)
- `autoApprove` (boolean; gating unchanged)
- `band`: `AUTO` | `AUTO_WITH_AUDIT` | `GATE`
- `requiredLevel`: `NONE` | `SALES_MANAGER` | `FINANCE`
- `chain`: empty / `[Sales Manager]` / `[Sales Manager, Finance]`
- `reasons` (human strings; prefix is a **reason code**, e.g. `MARGIN_FLOOR`)
- `categoryBreakdown` (for UI risk preview)

**AUTO_WITH_AUDIT**: still auto-approved, but risk is within 10 points of the 40 line — reviewers can inspect after the fact. Gating behaviour did not change.

Dry-run APIs (no stage change):

- `GET /api/dice/quotes/{id}/decision`
- `GET /api/dice/decisions?ids=`
- `POST /api/quotations/risk-preview` (in-memory quote, never persisted)

---

## 6. Service map — what each process owns

### 6.1 login (`backend/`, port 8080)

Spring Boot. Package `com.example.login`.

| Layer | Classes |
|---|---|
| API | `AuthController`, `PortalController`, `AdminUserController`, admin CRUD (`Product`, `PriceList`, `DiscountRule`, `Warehouse`, `SubscriptionPlan`, `RecommendationRule`), `AnalyticsController` |
| Domain | `User` (role, lockout, `customerId` for CUSTOMER) |
| Security | `JwtService`, `JwtAuthFilter`, refresh cookie + CSRF, `TokenRevocationService`, `RateLimiter` |
| Clients | `MailerClient`, `QuotationServiceClient` |

Auth: signup/login/refresh/logout/forgot/reset. Default signup role `SALES_REP`. Admin catalog is the **source of policy data** (products, discount ceilings) that quotation-service also reads from the same tables.

### 6.2 quotation-service (8082) — core

Typical Spring layout: `controller` → `service` → `repository` / `model`. DTOs in `web`. JWT in `security`. HTTP to deal-engine in `client`.

**Controllers**

| Path | Job |
|---|---|
| `/api/quotations` | CRUD, transition, approve/reject/return, customer-confirm, counter, audit, approval-chain, risk |
| `/api/products`, `/api/customers` | catalog (customers: admin create, self-register) |
| `/api/recommendations` | cart add-ons: admin rules + co-purchase history |
| `/api/dice` | decision dry-run |
| `/api/webhooks/odoo` | OEEG ingest (`X-OEEG-Key`, permitAll at Spring; key checked in controller) |

**Services to name**

- `QuotationService` — lifecycle, chain, deal conversion
- `DiceEngine` — scoring
- `ThresholdConfig` — tunable policy
- `QuotationCalculator` — line math / totals
- `DiceOdooIngestService` — ERP events
- `CoPurchaseStats` — observed pairing confidence

### 6.3 governance-engine (8084)

Does **not** re-implement scoring. `GovernanceService.evaluate` calls `GovernanceDataClient.fetchDiceDecision`, maps to `requiredLevel` + chain, **persists** `GovernanceEvaluation`. Approval-engine depends on this contract.

### 6.4 approval-engine (8085, Node)

Separate approval **stamps**: `approval_request` + steps + decisions, **quote version hash**, expiry. If the quote numbers change (negotiation), hash mismatch → stale. Complements (does not replace) the local `approval_step` table on the quotation.

### 6.5 negotiation-engine (8086, Node)

Comments, change-requests, counter-discount. Calls quotation-service to mutate lines. Writes `negotiation_event` and `quote_negotiation_version`.

### 6.6 deal-engine (8083)

- `POST /api/deals` `{ quotationId }` — snapshot live quote
- `POST /api/deals/{id}/convert-to-order` — **only** conversion path; re-fetches live quote; requires `APPROVED` or `ORDERED`
- Versions, lost, orders

Quotation-service `openAndConvertDeal` runs create + convert when a quote becomes `ORDERED`.

### 6.7 inventory-engine (8087)

Stock per warehouse. `reserve` greedily (largest available first) with **atomic conditional updates** so concurrent reservations cannot oversell. Shortfall → **backorder**. Also `reserve-exact`, `allocate`, `release`, consolidate backorders.

### 6.8 fulfillment-engine (8088)

`propose` a split (no reserve) → `accept` (commit reservations, rebuild lines from what inventory actually granted) or `override` (caller-specified warehouses, still reserved). Shipping weight heuristic `₹50/kg`.

### 6.9 Other Node engines

| Service | Port | Role |
|---|---|---|
| recommendation-engine | 8089 | `GET /api/recommendations/rank` |
| deal-health-engine | 8090 | read-only health dashboard aggregating quote/approval/negotiation/inventory |
| billing-engine | 8091 | invoices, recurring, credit notes, cancel |
| oeeg | 8092 | four scenario events → webhook |
| data-service | 8093 | TypeScript SQL gateway + tasks/notifications |
| monitor-service | 8094 | ops (not on quote path) |
| mailer | 4000 | reset email; **cluster-internal** |

### 6.10 gateway (8000, TypeScript/Fastify)

Structure: `src/app.ts` registers plugins → `routes/*` → `proxy/forward.ts` / service clients. Middleware: `request-id`, `auth` (JWT except public auth + OEEG key), `rbac`, `rate-limit`, `error-handler`. Metrics: Prometheus `/metrics` (Nginx should hide this). Swagger: `/documentation`.

---

## 7. Package structure cheat sheet (Java)

Every Java engine follows the same pattern:

```
src/main/java/com/example/<svc>/
  *Application.java
  controller/     HTTP
  service/        business rules
  model/          JPA entities / enums
  repository/     Spring Data
  security/       JWT filter, SecurityConfig, UserPrincipal
  client/         RestTemplate/WebClient to peers
  web/            request/response DTOs
  exception/      ApiExceptionHandler
src/main/resources/application.properties
```

Login lives under `backend/` with package `com.example.login` and extra `admin/` for catalog CRUD.

Node engines: `src/index.js` + `src/routes` + `src/services` + `src/middleware/auth.js`. They talk to Postgres **through data-service**.

---

## 8. Data model (tables you should be able to name)

Identity: `users`, `refresh_tokens`, `password_reset_tokens`, `revoked_tokens`

Catalog / policy: `product`, `customer`, `customer_price`, `price_list_entry`, `discount_rule`, `warehouse`, `subscription_plan`, `recommendation_rule` (Hibernate), `governance_threshold` (Hibernate)

Quote spine (Hibernate-owned, created via `ddl-auto`): `quotation`, `quotation_line`, `approval_step` (local chain), `audit_event`

Approval-engine: `approval_request`, `approval_step` (linked to request), `approval_decision`

Negotiation: `negotiation_event`, `quote_negotiation_version`

Billing: `invoice`, `invoice_line`, `subscription`, `billing_schedule`, `credit_note`, `refund`

Ops: `task`, `notification`

Deal/inventory/fulfillment entities are also Hibernate (`deal`, `quote_version`, `sales_order` / `order`, inventory reservation tables, `fulfillment_plan`).

---

## 9. Cross-service call flows (draw these)

**Login**

```
POST /api/auth/login → login → JWT + refresh cookie
```

**Create and submit quote**

```
SPA → gateway → quotation create (DRAFT, DICE riskScore stored)
SPA → gateway → transition PENDING_APPROVAL
quotation → DiceEngine
  AUTO → APPROVED (+ ORDERED if customerAccepted) → deal-engine create+convert
  GATE → approval_step rows, stay PENDING_APPROVAL
```

**Manager approves**

```
SPA → quotation /approve  (or approval-engine /approve, which consults governance)
```

**Customer counter**

```
SPA → negotiation-engine counter → quotation applyCounterDiscount → NEGOTIATION
approval-engine hash no longer matches live quote
```

**Fulfill**

```
SPA → fulfillment propose → inventory stock check (read)
SPA → fulfillment accept  → inventory reserve (write) → CONFIRMED plan
```

**Odoo demo**

```
OEEG dashboard → POST /api/oeeg/scenarios/{event}
OEEG → POST quotation /api/webhooks/odoo
DiceOdooIngestService → optional re-evaluate quote, audit DICE row
```

Do **not** route D.I.C.E. through OEEG.

---

## 10. Security talking points

- Stateless JWT; refresh rotation + revocation list (`jti`).
- Login lockout after failed attempts.
- Gateway + each service re-check auth (defense in depth).
- Webhook is not JWT; it is a shared `X-OEEG-Key`.
- Customer APIs hide margin/risk.
- Mailer is not on the public gateway.
- Demo secrets (`change-this-demo-secret…`) — say this is **hackathon-local**, would be vaulted in production.

---

## 11. What is intentionally split vs what is still dual

**Good splits:** identity vs quote brain vs deal snapshot vs inventory vs fulfillment vs ERP emulator.

**Know the honest complexity:** two approval surfaces exist — quotation-service’s `approval_step` (what the UI quote flow uses) and approval-engine’s hashed requests (stale detection). Governance is now a **persistence/adapter** over D.I.C.E., not a second scorer.

If asked “would you keep 12 processes in production?”: start with a **modular monolith** around quotation + D.I.C.E., keep inventory/fulfillment isolated because of locking, keep OEEG out of the hot path. The split is a **demo of bounded contexts**, not a claim that this is the final ops model.

---

## 12. Files to re-read the night before

1. `quotation-service/.../DiceEngine.java`
2. `quotation-service/.../QuotationService.java` (`submitForApproval`, `openAndConvertDeal`, `applyCounterDiscount`)
3. `quotation-service/.../PipelineStage.java`
4. `quotation-service/.../ThresholdConfig.java`
5. `governance-engine/.../GovernanceService.java` (delegation comment at top)
6. `deal-engine/.../DealService.java` (`convertToOrder`)
7. `inventory-engine/.../InventoryService.java` (`reserveStock`)
8. `fulfillment-engine/.../FulfillmentService.java` (propose vs accept)
9. `docs/api-gateway-catalog.md`
10. `gateway/src/app.ts` + `docker-compose.yml`

---

## 13. Likely judge questions — short answers

**Why microservices?** Bounded contexts for a hackathon: quote intelligence, stock locking, ERP emulation, and Node engines that share Postgres only via data-service. Gateway gives one origin and RBAC.

**What is D.I.C.E. vs OEEG?** D.I.C.E. decides. OEEG emits realistic Odoo events so we can show ingest without hosting ERP.

**How do you not double-score?** Governance deleted the duplicate rules; it stores whatever D.I.C.E. returned.

**How do you not oversell?** Inventory reserve uses compare-and-set on available quantity; remainder is backorder.

**How does auto-approve not skip audit?** `ApprovalBand.AUTO_WITH_AUDIT` flags near-threshold quotes without blocking the customer.

**What if deal-engine is down on ORDERED?** `openAndConvertDeal` is in the same transaction as the stage flip (HTTP in-request). If convert fails, the ORDERED transition is refused so quote and order cannot disagree.

**Customer data leak?** JWT customerId scoping + `sanitizeForCustomer` zeros margin/risk.
