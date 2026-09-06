# DealFlow360 — Technical Architecture & Full Workflow Document

**System:** DealFlow360 — a quote-to-cash control plane for B2B sales
**Decision brain:** D.I.C.E. — Deal Intelligence & Control Engine (resident in `quotation-service`)
**ERP surface:** OEEG — Odoo Event Emulator Gateway (emits events only; never decides)
**Repository root:** `/home/sanjeev/dice`
**Companion documents:** `docs/api-gateway-catalog.md` (endpoint reference), `docs/hackathon-backend-system-design.md` (review notes), `docs/demo-runbook.md` (demo script)

---

## Table of contents

| § | Section | Page |
|---|---|---|
| 1 | Executive summary and problem framing | 1 |
| 2 | Architectural principles and constraints | 2 |
| 3 | System topology and deployment model | 3 |
| 4 | The edge: Nginx, the Fastify gateway, and cross-cutting middleware | 4 |
| 5 | Identity, authentication, and authorization | 5 |
| 6 | Data architecture: schema ownership and the two persistence paths | 6 |
| 7 | D.I.C.E. — the decision engine in depth | 7 |
| 8 | The quote lifecycle state machine | 8 |
| 9 | Workflow A — quote construction and submission | 9 |
| 10 | Workflow B — human approval chains and the dual approval surfaces | 10 |
| 11 | Workflow C — negotiation, counter-offers, and approval staleness | 11 |
| 12 | Workflow D — deal snapshot and order conversion | 12 |
| 13 | Workflow E — fulfillment planning and inventory reservation | 13 |
| 14 | Workflow F — billing, recommendations, and deal health | 14 |
| 15 | Workflow G — OEEG event ingestion and the Odoo boundary | 15 |
| 16 | Frontend architecture and the three consoles | 16 |
| 17 | Configuration, operations, and local run procedure | 17 |
| 18 | Failure modes, consistency guarantees, and known limitations | 18 |
| 19 | Security posture and threat model | 19 |
| 20 | Evolution path and design retrospective | 20 |

---
---

# Page 1

## 1. Executive summary and problem framing

### 1.1 The business problem

In B2B sales, the gap between "a rep promises a price" and "the company can actually
honour that price profitably" is where margin leaks. The leak has three distinct causes,
and each of them is a separate engineering problem:

1. **Discretionary discounting.** A rep gives 18% to close a quarter. Nobody notices
   because 18% is on one line of a twelve-line quote, and the quote's headline discount
   is 6%. The discount policy exists — it lives in a spreadsheet nobody reads at quote time.
2. **Approval theatre.** To stop (1), companies route everything through a manager. The
   manager now approves 200 quotes a week, 190 of which are unremarkable, so approval
   becomes a rubber stamp and adds days of latency to deals that never needed review.
3. **Promises the warehouse cannot keep.** A quote becomes an order, the order assumes
   stock exists, and two orders confirmed within the same minute both claim the last
   forty units.

DealFlow360 addresses all three in one control plane. Policy is executed, not documented:
**D.I.C.E.** scores every quote against admin-configured ceilings at the moment of
submission. Clean quotes auto-approve and never touch a human queue. Borderline quotes
auto-approve but are **flagged for post-hoc audit**, so speed is not bought by giving up
oversight. Genuinely risky quotes enter a human chain sized to the actual risk — Sales
Manager alone where that is sufficient, Sales Manager then Finance where deal value or
margin demands it. On conversion to order, **inventory-engine** reserves stock through
atomic compare-and-set updates, so concurrent confirmations cannot oversell.

### 1.2 What the system is, in one paragraph

DealFlow360 is a fourteen-process distributed system fronted by a single HTTP origin.
A React SPA (three consoles: sales workspace, admin console, customer portal) talks
exclusively to an Nginx edge on `:80`, which reverse-proxies to a Fastify API gateway on
`:8000`. The gateway verifies JWTs, applies coarse role checks, stamps request IDs,
enforces rate limits, and forwards to one of thirteen backend services. Six of those are
Spring Boot (Java 21) services that own the transactional core — identity, quotes and
D.I.C.E., deals and orders, governance persistence, inventory, fulfillment. Seven are
Node/TypeScript services that handle approval stamping, negotiation, recommendation
ranking, deal health aggregation, billing, ERP event emulation, and shared SQL access.
All state lives in a single PostgreSQL 16 database, `dealflow`, on port `5433`. Redis
backs gateway rate limiting.

### 1.3 The three claims this document substantiates

| Claim | Where it is proven |
|---|---|
| **There is exactly one decision brain.** Governance does not re-score; it persists what D.I.C.E. returned. OEEG does not score at all. | §7, §15 |
| **The lifecycle is server-owned.** The Kanban board cannot invent a transition; legality is a server-side enum method. | §8 |
| **Overselling is structurally impossible, not merely unlikely.** Correctness comes from a conditional UPDATE, not from ordering or optimism. | §13 |

### 1.4 Reading guide

Sections 2–8 are architecture: topology, cross-cutting concerns, data, the decision
engine, and the state machine. Sections 9–15 are the seven end-to-end workflows, each
traced from browser click through gateway, service, and database. Sections 16–20 cover
the frontend, operations, failure analysis, security, and where this design should go
if it left the demo environment.

---
---

# Page 2

## 2. Architectural principles and constraints

The system is small enough that its shape was chosen rather than accreted. Seven rules
governed every decision, and each rule is enforceable — you can point at code that
breaks if the rule is violated.

### 2.1 Rule 1 — One decision brain

`DiceEngine` in `quotation-service/src/main/java/com/example/quotation/service/DiceEngine.java`
is the only component that computes risk, approval bands, or required approval levels.

The temptation in a microservice layout is to let each service that "cares about policy"
implement policy. `governance-engine` originally did exactly that — it had its own copy
of the discount ceiling rules. That duplicate was deleted. `GovernanceService.evaluate`
now calls `GovernanceDataClient.fetchDiceDecision`, maps the returned decision onto a
`RequiredLevel` and chain, and **persists** a `GovernanceEvaluation` row. It is an
adapter and an audit store, not a second opinion.

Why this matters: two scorers drift. The moment a threshold changes in one and not the
other, the system produces two defensible answers to "should this be approved" and no
way to say which is right.

### 2.2 Rule 2 — OEEG emits; D.I.C.E. decides

`oeeg` (`:8092`) exists so the system can demonstrate ERP reactivity without hosting a
live Odoo instance. It constructs Odoo-shaped event envelopes and POSTs them to
`quotation-service`'s webhook. It has no access to thresholds, no notion of risk, and no
write path into the quote spine except through that webhook.

The inverse routing — D.I.C.E. calling out to OEEG for a decision — is explicitly
forbidden and does not exist in the code.

### 2.3 Rule 3 — The server owns the lifecycle

`PipelineStage.canTransitionTo` (Java enum) is the sole authority on legal stage moves.
The Kanban UI can present a drag; it cannot cause an illegal transition, because the
transition endpoint re-validates. A client that POSTs `DRAFT → COMPLETED` receives a
`409`.

### 2.4 Rule 4 — Defense in depth on auth

The gateway verifies the JWT and applies coarse RBAC. Every downstream service **also**
verifies the same JWT with the same `app.jwt.secret` and applies its own business-rule
authorization. A request that reaches `quotation-service` directly on `:8082` — bypassing
the gateway — is still authenticated and authorized. The gateway is a convenience and a
policy chokepoint, not the only lock on the door.

### 2.5 Rule 5 — Node services do not open Postgres

Node engines never hold a Postgres connection to `dealflow` for the shared schema. They
POST SQL to `data-service` (`:8093`) at `/internal/sql`, authenticated by
`DATA_SERVICE_KEY`. This gives one place to add query logging, statement allowlisting,
or connection pooling policy, and keeps thirteen processes from each maintaining their
own pool against a single database.

(Exception, honestly noted: `approval-engine`, `negotiation-engine`, and `billing-engine`
each carry a `src/db/pool.js`. These route through data-service in the deployed
configuration; the pool module is the fallback path.)

### 2.6 Rule 6 — The gateway is the front door, and Nginx stays outside it

Nginx terminates the public origin, serves static SPA assets, gzips, sets timeouts, and
hides `/metrics`. It proxies `/api` to the Fastify gateway. It does **not** sit between
the gateway and the Java services. JWT verification, coarse RBAC, the error envelope
format, request-ID propagation, and GET-only retry logic all live in Fastify; inserting
a second proxy in that hop would either duplicate or bypass them.

### 2.7 Rule 7 — The SQL schema is the contract

`data-service/sql/schema.sql` defines the shared tables and is mounted into the Postgres
container as an init script. Hibernate's `ddl-auto=update` layers the Java-owned entity
tables on top, with snake_case naming that maps onto the same conventions. Where a table
is touched by both Java and Node (`approval_step` is the notable case), the schema file
is the arbiter of column shape.

### 2.8 Constraints accepted

| Constraint | Consequence |
|---|---|
| Hackathon timeline | `ddl-auto=update` instead of versioned migrations; demo secrets in compose |
| Single database | Cross-service joins are physically possible; discipline, not isolation, prevents them |
| Synchronous HTTP only | No message bus; cross-service consistency relies on in-request calls (§18) |
| Host-run engines | `start-all.sh` runs Java/Node on the host so iteration does not require image rebuilds |

---
---

# Page 3

## 3. System topology and deployment model

### 3.1 Process inventory

```
                         Browser
                            │
              ┌─────────────┴──────────────┐
              │                            │
     Nginx :80 (prod-style)      Vite :5173 (dev)
     SPA assets + /api proxy     HMR + proxy
              │                            │
              └─────────────┬──────────────┘
                            ▼
              ┌──────────────────────────────┐        ┌──────────┐
              │  Fastify API gateway  :8000  │◄──────►│ Redis    │
              │  JWT · RBAC · req-id ·       │        │ :6380    │
              │  rate-limit · envelopes ·    │        │ rate-lim │
              │  OpenAPI /documentation ·    │        └──────────┘
              │  Prometheus /metrics         │
              └──────────────┬───────────────┘
                             │
   ┌────────────┬────────────┼────────────┬────────────┬───────────┐
   ▼            ▼            ▼            ▼            ▼           ▼
 login       quotation     deal      governance    approval   negotiation
 :8080        :8082       :8083        :8084        :8085        :8086
 (Java)      (Java)       (Java)       (Java)       (Node)       (Node)
   │            │
   │            └── D.I.C.E. lives here
   ▼
 mailer :4000  (cluster-internal, NOT on public gateway)

   ┌────────────┬────────────┬────────────┬────────────┬───────────┐
   ▼            ▼            ▼            ▼            ▼           ▼
 inventory  fulfillment  recommend.  deal-health   billing       oeeg
  :8087       :8088        :8089       :8090        :8091        :8092
 (Java)      (Java)       (Node)      (Node)       (Node)       (Node)

                        data-service :8093 (TypeScript)
                        SQL gateway + tasks/notifications
                                 │
                        monitor-service :8094 (ops, off the quote path)
                                 │
                                 ▼
                    PostgreSQL 16  :5433  db `dealflow`
```

Two auxiliary dashboards run as separate Vite apps: `oeeg-dashboard` (fires emulator
scenarios) and `monitor-dashboard` (ops view).

### 3.2 Port map

| Port | Process | Runtime | Public? |
|---|---|---|---|
| 80 | nginx | Docker | **yes** — the production origin |
| 5173 | frontend (Vite) | host | dev only |
| 8000 | gateway | Docker | yes (behind nginx) |
| 8080 | login / backend | host (Spring Boot) | no |
| 8082 | quotation-service (**D.I.C.E.**) | host | no |
| 8083 | deal-engine | host | no |
| 8084 | governance-engine | host | no |
| 8085 | approval-engine | host (Node) | no |
| 8086 | negotiation-engine | host (Node) | no |
| 8087 | inventory-engine | host | no |
| 8088 | fulfillment-engine | host | no |
| 8089 | recommendation-engine | host (Node) | no |
| 8090 | deal-health-engine | host (Node) | no |
| 8091 | billing-engine | host (Node) | no |
| 8092 | oeeg | host (Node) | no |
| 8093 | data-service | Docker (TypeScript) | no |
| 8094 | monitor-service | host (Node) | no |
| 4000 | mailer-service | host (Node) | **never** |
| 5433 | PostgreSQL 16 | Docker | no |
| 6380 | Redis 7 | Docker | no |

### 3.3 The split deployment, and why

`docker-compose.yml` runs only five things: `postgres`, `redis`, `data-service`,
`gateway`, `nginx`. These are the components that rarely change during development and
that benefit from fixed networking.

The thirteen engines run on the host via `start-all.sh`. The reason is iteration speed:
changing one line in `DiceEngine.java` and rebuilding a Docker image is a minute-plus
cycle; `mvn spring-boot:run` against a warm target directory is seconds. Compose bridges
the two worlds with `extra_hosts: host.docker.internal:host-gateway`, so containerised
gateway and data-service reach host-run engines by hostname.

The cost of this choice is that "it works on compose" is not the same as "it works in
production" — a full containerisation would need a `Dockerfile` per engine and a service
mesh or DNS names in place of `host.docker.internal`. That work is deliberately deferred.

### 3.4 Startup ordering

`start-all.sh` enforces the ordering that matters:

1. `docker compose up -d postgres redis` — data plane first.
2. Compile all six Java services (`mvn -q -o compile`); **abort the whole start if any
   fails**, rather than bringing up a half-working cluster.
3. Start Java services, then Node services, then the Vite frontends.
4. `kill_port` before each start, so the script is safe to re-run.

Logs land in `logs/<service>.log`. `wait_port` polls with a 60×2s budget for services
whose readiness gates the next step.

---
---

# Page 4

## 4. The edge: Nginx, the Fastify gateway, and cross-cutting middleware

### 4.1 Nginx — the public origin

Nginx owns `:80` and is the only thing a browser should ever address in a production-style
run. Its responsibilities:

- Serve the built SPA (static assets, SPA-fallback routing for client-side routes).
- Reverse-proxy `/api/**` to `gateway:8000`.
- gzip, connection timeouts, and body-size limits at the edge.
- Pass through `X-Request-ID` so a browser-observed request ID matches the gateway log line.
- **Hide `/metrics`.** The Prometheus endpoint is not for the public internet.

Nginx does not verify JWTs, does not know about roles, and does not sit anywhere else in
the call graph.

### 4.2 Gateway composition (`gateway/src/app.ts`)

The gateway is a Fastify app assembled in a fixed order. Order is semantically load-bearing.

```
Fastify({ trustProxy: true, bodyLimit: 2 MiB })
  ├─ @fastify/cors        allowlist from CORS_ORIGINS, credentials: true
  ├─ @fastify/swagger     OpenAPI doc: "DealFlow360 API Gateway"
  ├─ @fastify/swagger-ui  served at /documentation
  ├─ registerRateLimit()  Redis-backed
  ├─ onRequest  : requestIdHook
  ├─ preHandler : authGuard
  ├─ onSend     : reply.header('X-Request-ID', request.requestId)
  ├─ onResponse : prom-client counter gateway_http_requests_total{method,status}
  ├─ setErrorHandler(errorHandler)
  ├─ GET /health   → { status, engine: 'D.I.C.E.', emulator: 'OEEG' }
  ├─ GET /metrics  → prom-client registry (default metrics + custom counter)
  └─ 15 route modules + one raw proxy mount
```

CORS is explicit about the headers the system actually uses:
`Content-Type`, `Authorization`, `X-XSRF-TOKEN`, `X-Request-ID`, `X-OEEG-Key`,
`Idempotency-Key`; and exposes `X-Request-ID` and `Set-Cookie` back to the browser. The
`Set-Cookie` exposure is what lets the refresh-cookie flow work cross-origin in dev.

### 4.3 Route modules vs. raw proxy

Fifteen route modules give the gateway typed, schema-validated, role-guarded surfaces:

```
auth · quotation · products · customers · dice · approval · negotiation ·
deal · fulfillment · recommendation · deal-health · billing · oeeg ·
governance · data
```

One service — inventory — is mounted as a raw pass-through:

```ts
mountProxy(app, '/api/inventory', 'inventory');
```

This is an accurate signal about maturity: inventory's HTTP surface is still evolving,
so the gateway forwards rather than pinning a schema it would have to keep amending.
Everything else goes through `proxy/forward.ts` or a dedicated proxy module
(`quotation.proxy.ts`, `approval.proxy.ts`, `deal.proxy.ts`, `negotiation.proxy.ts`)
that can reshape requests and normalise responses.

### 4.4 Middleware in detail

**`request-id.ts`** — accepts an inbound `X-Request-ID` or mints one, attaches it to
`request.requestId`, and the `onSend` hook echoes it. Combined with `utils/tracing.ts`,
this gives a correlation key that survives the gateway→service hop.

**`auth.ts` (`authGuard`)** — a global `preHandler`. Verifies the Bearer JWT against
`JWT_SECRET` and populates `request.user`. Two exemption classes: public auth routes
(`/api/auth/login`, `/signup`, `/refresh`, `/forgot-password`, `/reset-password`) and the
OEEG webhook, which authenticates by shared key instead.

**`rbac.ts` (`requireRoles`)** — deliberately coarse. Its contract, quoted from the
source comment: *"Coarse gateway RBAC. Services still enforce business rules."* Two
behaviours worth knowing:

- `ADMIN` short-circuits every check: `if (actual === 'ADMIN') return true;`
- A `SALES` / `SALES_REP` alias group exists, so historical role strings and current
  ones both satisfy a sales requirement.

The gateway will happily let a `SALES_MANAGER` reach `/api/quotations/{id}/approve`. It
is `quotation-service` that decides whether *this* manager matches *this* quote's next
pending step. That division is intentional: the gateway knows roles, the service knows
state.

**`rate-limit.ts`** — Redis-backed (`REDIS_URL`), so limits are shared if the gateway is
scaled horizontally rather than being per-instance.

**`error-handler.ts` + `utils/errors.ts`** — every failure becomes a uniform envelope.
`GatewayError(status, code, message)` is thrown by middleware (`UNAUTHORIZED`,
`FORBIDDEN`), and upstream service errors are normalised into the same shape so the SPA
has exactly one error contract to parse.

**`validate.ts` + `schemas/*.ts`** — JSON Schema validation for auth, quotation,
approval, and negotiation request bodies, rejecting malformed input before it costs a
service hop.

### 4.5 Observability

- **Metrics:** `prom-client` default process metrics plus
  `gateway_http_requests_total{method,status}` on `/metrics`.
- **Logs:** `utils/logger.ts` provides the Fastify logger instance; each service writes
  to `logs/<service>.log`.
- **Docs:** `/documentation` renders live OpenAPI from the registered route schemas, so
  the API reference cannot silently drift from the routes.
- **Health:** `/health` returns `{ status: 'ok', engine: 'D.I.C.E.', emulator: 'OEEG' }`
  — the payload doubles as a statement of which component is which.

---
---

# Page 5

## 5. Identity, authentication, and authorization

### 5.1 The login service

`backend/` — Spring Boot, package `com.example.login`, port `8080`. It owns two things
that look unrelated but are not: **identity** and the **admin policy catalog**. They live
together because the catalog is administered by the same people who administer users,
and because the catalog tables are read by `quotation-service` directly from Postgres —
so the owning service only needs to expose CRUD, not a hot read path.

| Layer | Classes |
|---|---|
| Auth API | `AuthController`, `PortalController`, `AdminUserController` |
| Admin catalog | `AdminCrudController`, `ProductController`, `PriceListController`, `DiscountRuleController`, `WarehouseController`, `SubscriptionPlanController`, `RecommendationRuleController`, `AnalyticsController` |
| Domain | `User`, `RefreshToken`, `PasswordResetToken`, `RevokedToken` |
| Security | `JwtService`, `JwtAuthFilter`, `SecurityConfig`, `CookieUtil`, `CsrfFilter`, `RefreshTokenService`, `TokenRevocationService`, `RateLimiter`, `UnauthorizedEntryPoint`, `ForbiddenAccessDeniedHandler` |
| Clients | `MailerClient`, `QuotationServiceClient` |

### 5.2 Token model

**Access token** — JWT, 15-minute lifetime, carried as `Authorization: Bearer`. Claims
include subject (username), `role`, and — for customer users — `customerId`. Signed with
`app.jwt.secret`, and *every* service is configured with the same secret so any of them
can verify independently.

**Refresh token** — opaque, stored in `refresh_tokens`, delivered as an **httpOnly**
cookie named `refresh`. Not readable by JavaScript, so XSS cannot exfiltrate it.

**Rotation and revocation** — `RefreshTokenService` rotates on each use.
`TokenRevocationService` maintains `revoked_tokens` keyed by JWT `jti`, giving genuine
logout semantics: a stolen access token stops working at logout, not merely at expiry.

**CSRF** — because refresh rides a cookie, `CsrfFilter` requires an `X-XSRF-TOKEN` header
on `/api/auth/refresh` and `/api/auth/logout`. The gateway is configured to forward both
`Cookie` and `X-XSRF-TOKEN` on those two routes specifically.

**Brute-force resistance** — `RateLimiter` at the login service plus account lockout
after repeated failures, recorded on the `User` entity.

### 5.3 Authentication flows

```
Signup   POST /api/auth/signup   { username, email, password }
         → creates User (default role SALES_REP), sets refresh cookie, returns access JWT

Login    POST /api/auth/login    { username, password }
         → { success, message, accessToken } + Set-Cookie: refresh=…; HttpOnly

Refresh  POST /api/auth/refresh  (cookie + X-XSRF-TOKEN)
         → new access JWT, rotated refresh cookie

Logout   POST /api/auth/logout   (Bearer + cookie + CSRF)
         → revokes jti, clears refresh cookie

Forgot   POST /api/auth/forgot-password { email }
         → row in password_reset_tokens; MailerClient → mailer-service :4000

Reset    POST /api/auth/reset-password  { token, password }
         → consumes token, updates hash, clears lockout

Profile  GET  /api/portal/me
```

The mailer hop is the one call in the system that must never be reachable from outside.
`mailer-service:4000` exposes `POST /send-reset-email { to, resetLink }` with no auth,
on the assumption of cluster-internal networking. It is deliberately absent from the
gateway routing table.

### 5.4 Roles

`ADMIN` · `SALES_MANAGER` · `SALES_REP` · `FINANCE` · `CUSTOMER`

| Role | Scope |
|---|---|
| `ADMIN` | Everything. Bypasses gateway RBAC and can act on any approval step. |
| `SALES_MANAGER` | First-tier approval; analytics; read/write discount rules. |
| `SALES_REP` | Create/update quotes, build carts, submit for approval. Default signup role. |
| `FINANCE` | Second-tier approval; billing mutations; fulfillment mutations. |
| `CUSTOMER` | Own quotes and orders only. Accept, counter, comment. |

### 5.5 Customer isolation — the most important authorization rule

A `CUSTOMER` token carries a `customerId` claim. Two mechanisms enforce isolation:

1. **Query forcing.** `QuotationService.getVisibleTo` and the list endpoints override any
   client-supplied `customerId` filter with the claim value.
   `assertCustomerAccess(quotation, actor)` throws for a mismatch, so a guessed ID in the
   path yields `403`, not another customer's quote.
2. **Field stripping.** `sanitizeForCustomer(quotation, actor)` zeroes `marginPercent`
   and `riskScore` before serialisation. Even for their *own* quote, a customer must not
   see the internal margin or the D.I.C.E. score — those are the company's negotiating
   position.

The same discipline appears in `deal-engine` (`assertOwnsOrder`, `assertOwnsDeal`,
`getOrderVisibleTo`, `listMine`).

### 5.6 Service-to-service authentication

There are three distinct patterns, chosen by trust boundary:

| Caller → callee | Mechanism |
|---|---|
| Browser → gateway → any service | User's Bearer JWT, forwarded verbatim |
| Service → service on the user's behalf (fulfillment→inventory, quotation→deal) | The **caller propagates the original bearer token**, so downstream authorization still evaluates the real user |
| Node engine → data-service | `DATA_SERVICE_KEY` shared secret |
| OEEG → quotation webhook | `X-OEEG-Key` shared secret |

The second row is why service methods take a `bearerToken` parameter
(`DealService.convertToOrder(dealId, bearerToken, username)`,
`FulfillmentService.acceptPlan(planId, bearerToken)`). The system never escalates to a
machine identity mid-flow; a user who cannot see an order cannot cause a plan to be
built against it either.

---
---

# Page 6

## 6. Data architecture: schema ownership and the two persistence paths

### 6.1 One database, two creation mechanisms

`dealflow` on `postgres:5433` holds everything. Tables arrive by two routes:

**Route A — `data-service/sql/schema.sql`.** Mounted into the container at
`/docker-entrypoint-initdb.d/01-schema.sql`, executed on first initialisation. This file
is the contract for tables that Node services read and write, and for identity/catalog
tables.

**Route B — Hibernate `ddl-auto=update`.** Java services create and evolve their own
entity tables at boot. `quotation`, `quotation_line`, `audit_event`, `deal`,
`quote_version`, `sales_order`, inventory tables, and `fulfillment_plan` arrive this way.

Where a table is touched by both worlds, `schema.sql` wins: it is created first, and
Hibernate's snake_case naming strategy is chosen to map onto the same column names.
`approval_step` is the canonical example and the one to be careful with (§10.4).

### 6.2 Table inventory by bounded context

**Identity (schema.sql, read/written by login)**
`users` · `refresh_tokens` · `password_reset_tokens` · `revoked_tokens`

**Catalog & policy (schema.sql; written by admin console, read by D.I.C.E.)**
`product` · `customer` · `customer_price` · `price_list_entry` · `discount_rule` ·
`warehouse` · `subscription_plan`

**Policy (Hibernate, quotation-service)**
`recommendation_rule` · `governance_threshold`

**Quote spine (Hibernate, quotation-service)**
`quotation` · `quotation_line` · `approval_step` (local chain) · `audit_event`

**Approval stamps (schema.sql, approval-engine)**
`approval_request` · `approval_step` · `approval_decision`
with `idx_approval_request_quotation ON approval_request(quotation_id)`

**Negotiation (schema.sql, negotiation-engine)**
`negotiation_event` · `quote_negotiation_version`
with `idx_negotiation_event_quotation ON negotiation_event(quotation_id)`

**Billing (schema.sql, billing-engine)**
`invoice` · `invoice_line` · `subscription` · `billing_schedule` · `credit_note` · `refund`

**Deal & order (Hibernate, deal-engine)**
`deal` · `quote_version` · `quote_version_line` · `sales_order` · `order_line`

**Inventory & fulfillment (Hibernate)**
`inventory` · `inventory_reservation` · `warehouse_allocation` · `backorder` ·
`fulfillment_plan` · `fulfillment_allocation_line`

**Ops (schema.sql, data-service)**
`task` · `notification`
with `idx_task_username`, `idx_notification_username`

### 6.3 The quote spine in detail

```
quotation
  id, quote_no ("Q-1001"…), customer_id, rep_username,
  stage (PipelineStage), status,
  subtotal, discount_total, total, margin_percent,
  risk_score,               ← D.I.C.E. output, persisted at evaluation
  customer_accepted,        ← cleared by counter-offer
  created_at, updated_at

quotation_line
  id, quotation_id, product_id, product_name,
  quantity, unit_price,     ← resolved via customer_price → price_list_entry → product
  discount_percent, subtotal

approval_step  (quotation-service's local chain)
  id, quotation_id, step_name ("Sales Manager" | "Finance"),
  sequence, status (PENDING | APPROVED | REJECTED | RETURNED),
  actor_username, reason, acted_at

audit_event
  id, quotation_id, username, action, reason, from_stage, to_stage, created_at
  action ∈ { DICE, TRANSITION, APPROVE, REJECT, RETURN, COUNTER, CUSTOMER_CONFIRM, ODOO_INGEST }
```

`audit_event` is the system's memory. Every D.I.C.E. reason string becomes its own row
with `action = DICE`. A quote scored on eight rules produces eight audit rows, each one
independently readable, each prefixed with a machine-parsable reason code
(`MARGIN_FLOOR`, `CATEGORY_BLEND`, `DEAL_VALUE`, …). This is why the audit trail answers
"why was this approved" rather than merely "it was approved."

### 6.4 Price resolution

Unit price is not `product.price`. `applyLines` resolves in precedence order:

1. `customer_price` — a negotiated price for this customer and product.
2. `price_list_entry` — the price list this customer's tier maps to.
3. `product.base_price` — fallback.

The resolved price is **copied onto `quotation_line.unit_price`**, not referenced. A
later catalog price change does not retroactively alter a live quote. This is standard
for quoting systems and it is what makes `quote_version` snapshots meaningful.

### 6.5 data-service — the Node persistence path

TypeScript, `:8093`, three files: `src/server.ts` (bootstrap), `src/app.ts` (routes),
`src/db.ts` (pool). It exposes:

- `POST /internal/sql` — parameterised SQL execution, authenticated by `DATA_SERVICE_KEY`.
- Task and notification endpoints backed by `task` and `notification`.

There is also a `pg-compat.js` shim in the service root, present to smooth driver
differences between the environments this runs in.

The value of the indirection is centralisation, not abstraction: one connection pool,
one place to add query logging, one place where a statement allowlist could be added.

### 6.6 Governance thresholds — data as configuration

`governance_threshold` (key/value, Hibernate-owned) makes policy runtime-tunable.
`ThresholdConfig` merges compiled defaults with DB rows, DB winning, behind a **5-second
TTL cache** (`CACHE_TTL_MS = 5_000`, `volatile Map` snapshot).

| Key | Default | Meaning |
|---|---|---|
| `auto_approve_risk` | 40.0 | Score at/above which a human is required |
| `margin_floor` | 20.0 | Minimum gross margin % before Finance is pulled in |
| `deal_value_finance` | 5,000,000 (₹50L) | Deal value above standard sales authority |
| `blended_overage_finance` | 8.0 | Stacked category overage points forcing Finance |
| `anomaly_discount` | 25.0 | Overall discount % that is inherently suspicious |
| `audit_band_width` | 10.0 | Width of the post-hoc audit band below the auto line; **0 disables it** |
| `ceiling_bronze` | 5.0 | Tier discount ceiling |
| `ceiling_silver` | 10.0 | |
| `ceiling_gold` | 15.0 | |
| `ceiling_platinum` | 20.0 | |
| `ceiling_default` | 10.0 | Unknown/absent tier |
| `ceiling_service_cap` | 10.0 | Hard cap for service categories regardless of tier |

The 5-second cache is the deliberate compromise: an admin changing a ceiling sees it
apply to the next quote within seconds, and the engine does not issue a config read per
scored line.

---
---

# Page 7

## 7. D.I.C.E. — the decision engine in depth

**File:** `quotation-service/src/main/java/com/example/quotation/service/DiceEngine.java`
**Entry point:** `Decision evaluate(Quotation quotation)`
**Purity:** reads customers, products, discount rules, thresholds; writes nothing.
Persistence and stage transitions are the caller's job. This is what makes dry-run and
risk-preview possible without a shadow code path.

### 7.1 The output contract

```java
public record Decision(
    double            riskScore,          // 0–100, capped
    boolean           autoApprove,
    ApprovalBand      band,               // AUTO | AUTO_WITH_AUDIT | GATE
    RequiredLevel     requiredLevel,      // NONE | SALES_MANAGER | FINANCE
    List<String>      chain,              // [] | [Sales Manager] | [Sales Manager, Finance]
    List<String>      reasons,            // human strings, reason-code prefixed
    List<CategoryRisk> categoryBreakdown  // per-category detail for the UI
) {}

public record CategoryRisk(
    String  category,
    double  lineCount,
    double  blendedDiscountPercent,
    double  ceiling,
    double  overage,
    double  categoryRiskScore,
    boolean breached
) {}
```

`RequiredLevel` is an ordered enum, and escalation uses
`highest(a, b) → a.ordinal() >= b.ordinal() ? a : b`. Rules can only ratchet the required
level upward. No rule can quietly downgrade another rule's demand — with exactly one
audited exception (§7.9).

### 7.2 Inputs

- Quote lines: `discountPercent`, `subtotal`, quantity, product ID
- Customer **tier**: Bronze / Silver / Gold / Platinum
- Product **category** per line (missing product → `"General"`)
- Admin-configured `discount_rule` ceilings keyed by (tier, category)
- The twelve `ThresholdConfig` values

`loadConfiguredCeilings()` catches `RuntimeException` and falls back to an empty list —
which means the built-in tier ladder applies. **A policy-table outage degrades to
defaults rather than failing the evaluation.** A quote is never blocked because the
ceiling table was briefly unreadable.

### 7.3 Rule 1 — Baseline discount

```java
overallDiscount = subtotal > 0 ? discountTotal / subtotal * 100.0 : 0;
risk += overallDiscount * 1.2;
```

Every quote gets a floor contribution proportional to what it gives away. The 1.2
multiplier means a 20% overall discount alone reaches 24 — meaningful but not yet gating.

Reason: `BASELINE_DISCOUNT: overall discount X% contributes Y risk`

### 7.4 Rule 2 — Category blend (the anti-hiding rule)

This rule is the reason the engine exists. Lines are grouped by product category and the
category's discount is computed as a **value-weighted average**:

```java
acc[0] += line.getDiscountPercent() * lineValue;   // lineValue = max(subtotal, 0.01)
acc[1] += lineValue;
blendedDiscount = acc[0] / acc[1];
```

Then against the applicable ceiling:

```java
over        = blendedDiscount - ceiling;
breached    = over > 0;
categoryRisk = breached ? over * 2.0 : 0;
```

The weighting is doubly protective, and the source comment states both directions:
*"line values within the category are weighted by their own subtotal so a few thin-margin
lines can't hide behind a big low-risk one, and a single wild outlier line can't dominate
a category that's mostly fine either."*

A breach escalates to at least `SALES_MANAGER`. The `max(subtotal, 0.01)` floor prevents
a zero-value line from producing a division-by-zero or an infinitely-weighted entry.

Reason: `CATEGORY_BLEND: <Category> blended discount X% across N item(s) exceeds <Tier> ceiling C%`

**Ceiling resolution** (`ceilingFor`): an exact case-insensitive (tier, category) match in
`discount_rule` wins outright. Otherwise `defaultCeiling` applies the tier ladder — and
if the category name contains `"service"`, the result is
`min(tierCeiling, ceiling_service_cap)`. A Platinum customer with a 20% tier ceiling is
still capped at 10% on services, because services carry the thinnest margin and a
Platinum badge does not change that.

Service breaches add their own reason: `SERVICE_LINE_STRICT`.

### 7.5 Rule 3 — Blended overage disclosure

```java
if (blendedOverage > 0 && blendedOverage < 8 && anyLineOver) { … }
```

Sub-threshold stacking is *reported* even when it does not yet force Finance:

`BLENDED_OVERAGE: stacked category overages total X points — pattern cannot slip as "each category is almost fine"`

This is a pure transparency rule. It changes no score and no level; it puts the pattern
in the audit trail so a reviewer can see that three categories were each 2 points over
rather than concluding that nothing was over.

### 7.6 Rules 4–7 — Margin, value, stacking, anomaly

```java
// Rule 4 — margin floor
if (marginPercent < margin_floor) {
    risk += (margin_floor - marginPercent) * 1.5;
    required = highest(required, FINANCE);          // MARGIN_FLOOR
}

// Rule 5 — deal value
if (total > deal_value_finance) {
    risk += 15;
    required = highest(required, FINANCE);          // DEAL_VALUE
}

// Rule 6 — blended overage forces Finance
if (blendedOverage >= blended_overage_finance) {
    required = highest(required, FINANCE);          // BLENDED_FINANCE
}

// Rule 7 — discount anomaly
if (overallDiscount >= anomaly_discount) {
    risk += 10;
    required = highest(required, SALES_MANAGER);    // DISCOUNT_ANOMALY
}
```

Note the asymmetry: margin and value *add* risk **and** escalate; blended-overage
escalates without adding risk (the category rule already charged for it — double-charging
would distort the score).

### 7.7 Rule 8 — Risk threshold backstop

```java
if (risk >= auto_approve_risk && required == RequiredLevel.NONE) {
    required = SALES_MANAGER;                       // RISK_THRESHOLD
}
```

The catch-all. A quote can accumulate 40+ points purely from baseline discount without
tripping any single named rule. This rule ensures accumulated risk still buys a human
look. The `required == NONE` guard prevents it from adding a redundant reason when
another rule already escalated.

### 7.8 Rule 9 — Premium tier fast-track

```java
boolean goldFastTrack =
       isPremiumTier(customer.getTier())     // "gold" or "platinum", substring, case-insensitive
    && !anyLineOver                          // zero category breaches
    && overallDiscount < 10
    && marginPercent >= margin_floor
    && total <= deal_value_finance;
```

This is the **only** downgrade in the engine, and it is conjunctive across five
conditions. A Gold customer with a single breached category, or 11% overall discount, or
19% margin, or a ₹51L total does not qualify. When it does fire:

```java
boolean autoApprove = (required == NONE) || goldFastTrack;
if (goldFastTrack) required = NONE;
```

Reason: `TIER_FAST_TRACK: <Tier> quote is inside every ceiling, margin is healthy, value is under authority`

The business meaning: a good customer buying normally should never wait in a queue. The
guard conditions make "buying normally" precise rather than a matter of trust.

### 7.9 Chain derivation

```java
chain = switch (required) {
    case FINANCE      -> List.of("Sales Manager", "Finance");
    case SALES_MANAGER-> List.of("Sales Manager");
    case NONE         -> List.of();
};
```

Finance never reviews alone — a Finance-level quote always passes the manager first, so
the commercial context is established before the financial judgment. When only a manager
is needed, the engine says so explicitly:
`SKIP_FINANCE: only Sales Manager is required — Finance step omitted`. Stating the
omission is as auditable as stating the inclusion.

### 7.10 Band assignment — the three-way split

```java
double finalRisk  = Math.min(risk, 100);
double auditFloor = auto_approve_risk - audit_band_width;   // 40 − 10 = 30

if (!autoApprove)                                     band = GATE;
else if (!goldFastTrack && finalRisk >= auditFloor)   band = AUTO_WITH_AUDIT;
else                                                  band = AUTO;
```

| Band | Score (defaults) | Customer experience | Reviewer experience |
|---|---|---|---|
| `AUTO` | < 30, or fast-tracked | Instant approval | Nothing queued |
| `AUTO_WITH_AUDIT` | 30 ≤ risk < 40 | Instant approval | Flagged for post-hoc review |
| `GATE` | ≥ 40, or any escalating rule | Waits for a human | Appears in the approval queue |

The critical property, stated in the source comment: *"Gating behaviour is unchanged —
anything that used to require a human still does."* The audit band was carved out of the
region that was already auto-approving. It removes no friction and adds no friction; it
adds **visibility** to a range that previously produced silence.

Note `!goldFastTrack` in the middle branch: a fast-tracked quote is never flagged for
audit even if its raw score reached 30+. The fast-track's five conditions are a stronger
statement of safety than the score is.

Reasons appended at the end: `AUTO_APPROVE: risk X and policy allow the quote to skip the
human queue`, and for the middle band `POST_HOC_AUDIT: risk X is within Y points of the
review line — approved now, flagged for after-the-fact review`.

### 7.11 Dry-run surfaces

Three read-only entry points, none of which mutate:

| Endpoint | Input | Use |
|---|---|---|
| `GET /api/dice/quotes/{id}/decision` | persisted quote | "Why would this be gated?" |
| `GET /api/dice/decisions?ids=` | batch of quote IDs | Approval-queue reason batching |
| `POST /api/quotations/risk-preview` | an **in-memory** quote request | Live preview in the builder — never persisted |

`previewRisk` is what lets a rep see the risk consequence of a discount slider before
saving anything. It builds a transient `Quotation`, runs `evaluate`, and discards it.
There is no draft row, no audit noise, and — crucially — no second implementation of the
scoring rules for the preview to drift from.

---
---

# Page 8

## 8. The quote lifecycle state machine

### 8.1 Stages

```
DRAFT → PENDING_APPROVAL → NEGOTIATION → APPROVED → ORDERED → FULFILLMENT → COMPLETED
```

The arrow diagram above is the happy path. The actual legality table (`PipelineStage.canTransitionTo`) is richer:

| From | Legal targets | Why |
|---|---|---|
| `DRAFT` | `PENDING_APPROVAL`, `NEGOTIATION` | Submit, or open a conversation before submitting |
| `PENDING_APPROVAL` | `NEGOTIATION`, `APPROVED`, `DRAFT` | Counter, approve, or return for revision |
| `NEGOTIATION` | `PENDING_APPROVAL`, `APPROVED` | Re-submit after changes, or approve the negotiated form |
| `APPROVED` | `ORDERED`, `NEGOTIATION` | Convert, or reopen if the customer counters post-approval |
| `ORDERED` | `FULFILLMENT` | One way |
| `FULFILLMENT` | `COMPLETED` | One way |
| `COMPLETED` | — | Terminal |

### 8.2 Properties of the machine

**Server-owned.** `POST /api/quotations/{id}/transition { toStage }` calls
`canTransitionTo` before doing anything else. The Kanban board in `pages/workspace/Pipeline.jsx`
is a *view* of stage; dragging issues a transition request that the server may refuse.

**No backward path from ORDERED.** Once a deal exists and an order has been created,
the quote cannot return to a mutable state. Amendments become new quotes; the historical
record stays intact.

**`NEGOTIATION` is reachable from three stages**, including `APPROVED`. This is not an
oversight — it is the mechanism by which approval becomes stale (§11). A customer who
counters after approval must be able to do so, and the system must recognise that the
prior approval no longer describes the current quote.

**`PENDING_APPROVAL → DRAFT`** is the "return for revision" path, distinct from
rejection. Rejection also lands in `DRAFT` but carries different audit semantics and a
different reason code.

### 8.3 Stage vs. status

`stage` is the pipeline position; `status` is the qualifier. They are separate columns
because the same stage can be reached by different means and the distinction matters for
reporting:

| stage | status | Meaning |
|---|---|---|
| `APPROVED` | `AUTO_APPROVED` | D.I.C.E. cleared it; no human acted |
| `APPROVED` | `APPROVED` | A human chain completed |
| `PENDING_APPROVAL` | `PENDING_APPROVAL` | Waiting on a step |
| `DRAFT` | `RETURNED` / `REJECTED` | Came back from a reviewer, with reason |

"How many quotes did managers actually approve last month?" is answerable only because
`AUTO_APPROVED` is distinguishable from `APPROVED`.

### 8.4 Transition entry points

Five distinct paths cause a stage change:

1. `POST /api/quotations/{id}/transition` — explicit, from the workspace UI.
2. `POST /api/quotations/{id}/customer-confirm` — customer accepts as-is; runs D.I.C.E.
   and may land in `APPROVED` or `ORDERED` in one step.
3. `POST /api/quotations/{id}/approve` — chain advance; final step lands `APPROVED`.
4. `POST /api/quotations/{id}/reject` / `/return` — back to `DRAFT`.
5. `POST /api/quotations/{id}/counter-discount` — forces `NEGOTIATION`.

All five funnel through `QuotationService`, which is annotated `@Transactional` at the
class level. Every one of these operations is a single database transaction.

---
---

# Page 9

## 9. Workflow A — quote construction and submission

### 9.1 Building the quote

A `SALES_REP` opens `pages/workspace/QuotationBuilder.jsx`.

```
SPA → GET /api/customers                      → quotation-service :8082
SPA → GET /api/products?q=&category=          → quotation-service :8082
SPA → GET /api/recommendations?productIds=    → quotation-service :8082
```

The recommendation call is worth noting: it blends **admin-authored rules**
(`recommendation_rule`) with **observed co-purchase statistics** (`CoPurchaseStats`), so
the cart suggests both what policy says should be attached and what customers actually
buy together.

### 9.2 Creating the draft

```
POST /api/quotations
{ customerId, lines: [{ productId, quantity, discountPercent }, …] }
```

`QuotationService.create(request, repUsername)`:

1. Load the customer; 404 if absent.
2. `applyLines(...)` — for each line, resolve unit price by the
   `customer_price → price_list_entry → product` precedence, snapshot the product name,
   compute the line subtotal.
3. `QuotationCalculator` — totals: `subtotal`, `discountTotal`, `total`, `marginPercent`.
4. `nextQuoteNo()` — an `AtomicInteger` seeded at 1000 produces `Q-1001`, `Q-1002`, …
5. `stage = DRAFT`.
6. Run `DiceEngine.evaluate` and persist the resulting `riskScore` on the row.

Point 6 is significant. The quote is scored **on creation**, not only on submission. The
Kanban board can therefore colour every draft by risk before anyone submits it, and a rep
sees the consequence of a discount immediately.

Live preview while editing uses `POST /api/quotations/risk-preview`, which scores an
in-memory quote that is never written.

Updates go through `PUT /api/quotations/{id}` and are **restricted to `DRAFT`**. Once
submitted, the numbers are frozen until a counter-offer or a return unfreezes them.

### 9.3 Submission — `submitForApproval`

Triggered by `transition → PENDING_APPROVAL` or by `customer-confirm`. The full sequence
inside a single transaction:

```
 1. decision = diceEngine.evaluate(quotation)
 2. quotation.riskScore = decision.riskScore()
 3. for each reason in decision.reasons():
        logAudit(quotation, username, "DICE", reason, fromStage, toStage)
 4. if (decision.autoApprove()):
        stage  = APPROVED
        status = "AUTO_APPROVED"
        if (quotation.isCustomerAccepted()):
            stage = ORDERED
            openAndConvertDeal(quotation, bearerToken)     ← same transaction
    else:
        stage  = PENDING_APPROVAL
        startApprovalChain(quotation, decision.chain())
 5. save
```

**Step 3 is the audit contract.** Not "a decision was made" but every individual reason,
each as its own row, each independently queryable by its reason-code prefix. A quote
scored on baseline + two category breaches + margin floor produces four `DICE` rows.

**Step 4's nested condition** is the fast path. If the customer has already accepted the
quote (they confirmed while it was still risky, then a counter-offer brought it back into
policy) and D.I.C.E. now auto-approves, the quote goes straight from submission to
`ORDERED` — deal created, order created — with no intermediate stop at `APPROVED`.

### 9.4 `openAndConvertDeal` — the atomicity decision

```java
private void openAndConvertDeal(Quotation quotation, String bearerToken) {
    // create deal + convert to order via DealEngineClient, inside the caller's transaction
}
```

Two HTTP calls to `deal-engine` execute inside the enclosing database transaction. If
either fails, the exception propagates, the transaction rolls back, and the quote is
**not** marked `ORDERED`.

This is a deliberate trade, and it is worth being explicit about both halves:

| Gained | Paid |
|---|---|
| Quote and order can never disagree. There is no state where a quote claims `ORDERED` and no order exists. | The transaction holds while HTTP is in flight. `deal-engine` being slow means a held DB transaction. `deal-engine` being down means `ORDERED` is unreachable. |

The alternative — an outbox table plus an async worker — is the correct production
answer and is discussed in §20. For a system where a quote-order mismatch is a
data-integrity incident and downtime is a demo inconvenience, refusing the transition is
the right failure mode.

### 9.5 Building the approval chain

```java
private void startApprovalChain(Quotation quotation, List<String> chain) {
    // sequence 1..n, one ApprovalStep row per name, all PENDING
}
```

The chain is `["Sales Manager"]` or `["Sales Manager", "Finance"]`, sequenced. Rows are
created up front, so the queue can show a manager both the step they own and what comes
after it.

### 9.6 Customer-initiated submission

`POST /api/quotations/{id}/customer-confirm` — the customer accepts the quote as
presented.

1. `assertCustomerAccess` — the JWT `customerId` must match.
2. `customerAccepted = true`.
3. Run the same `submitForApproval` path.

The outcome depends entirely on D.I.C.E.: an in-policy quote goes `APPROVED → ORDERED`
with a deal and order created before the response returns; an out-of-policy quote enters
`PENDING_APPROVAL` with `customerAccepted` already set, so that when the chain completes
the quote proceeds to `ORDERED` without asking the customer again.

---
---

# Page 10

## 10. Workflow B — human approval chains and the dual approval surfaces

### 10.1 The queue

A `SALES_MANAGER` opens `pages/admin/ApprovalQueue.jsx`. The queue lists quotes in
`PENDING_APPROVAL` and — this is the interesting part — shows *why* each is there,
without N round trips:

```
GET /api/dice/decisions?ids=101,102,103,…
```

One batched call returns decisions for the whole visible page. The manager reads
`MARGIN_FLOOR`, `CATEGORY_BLEND: Services blended 14% exceeds Silver ceiling 10%`, and
so on, in the list, and can triage before opening anything.

`pages/admin/ApprovalReview.jsx` is the detail view: full reason list, per-category
breakdown from `categoryBreakdown`, the line items, and the approve/reject/return actions.

### 10.2 Acting on a step

```
POST /api/quotations/{id}/approve  { reason }
POST /api/quotations/{id}/reject   { reason }
POST /api/quotations/{id}/return   { reason }
```

`QuotationService.approve(id, username, role, reason, bearerToken)`:

```
1. requirePendingApproval(id)         → 409 unless stage == PENDING_APPROVAL
2. assertApprover(role)               → role ∈ { ADMIN, SALES_MANAGER, FINANCE }
3. step = nextPendingStep(quotationId) → lowest-sequence PENDING step
4. assertStepRole(role, step)         → stepRole(step.name) must match, ADMIN always passes
5. step.status = APPROVED; record actor, reason, timestamp
6. if no PENDING steps remain:
       stage = APPROVED; status = "APPROVED"
       if (customerAccepted) { stage = ORDERED; openAndConvertDeal(...) }
7. logAudit(action = "APPROVE")
```

Step 4 is the rule that makes the chain a chain. Finance cannot approve while the Sales
Manager step is still pending — `nextPendingStep` returns the manager step, and
`assertStepRole` rejects a `FINANCE` actor against it. Order is enforced by data, not by
UI sequencing.

`ADMIN` bypasses step-role matching. This is a demo-operability decision, and it is
logged like any other action, so the bypass is visible in the audit trail.

**Reject** and **return** both set `stage = DRAFT` and require a reason. They differ in
audit action (`REJECT` vs `RETURN`) and in status, which is what lets the rep's queue
distinguish "fix this and resubmit" from "this is dead."

### 10.3 The second approval surface — approval-engine

`approval-engine` (`:8085`, Node) maintains an independent record with a different
purpose:

```
approval_request   id, quotation_id, quote_version_hash, status, expires_at, created_at
approval_step      id, request_id, step_name, sequence, status
approval_decision  id, request_id, step_id, actor, decision, reason, created_at
```

The distinguishing field is **`quote_version_hash`** — a hash of the quote's material
numbers at the moment approval was granted. Its endpoints:

```
GET  /api/approvals?quotationId=&status=
GET  /api/approvals/{id}
GET  /api/approvals/{id}/decisions
POST /api/approvals                                    { quotationId }
POST /api/approvals/by-quotation/{id}/invalidate       { reason }
POST /api/approvals/{id}/approve | /reject | /return   { reason }
```

Internally it uses `governanceClient.js` (to learn the required level, which governance
sourced from D.I.C.E.) and `quotationClient.js` (to read live quote numbers and compute
the current hash).

### 10.4 Why two surfaces exist

This is the system's most-questioned design point, and the honest answer has two parts.

**The functional part.** They answer different questions:

| Surface | Question answered |
|---|---|
| `quotation-service.approval_step` | "Whose turn is it right now?" |
| `approval-engine.approval_request` | "Does the approval we have still describe the quote we have?" |

The version hash is the whole point of the second surface. When a customer counters and
line discounts change, the quote's hash changes, and every prior `approval_request`
becomes detectably stale — without anyone having to remember to invalidate it. The local
`approval_step` table has no such mechanism; it is cleared outright on counter, which
handles the current chain but leaves no record that a *previously completed* approval was
superseded.

**The honest part.** This is genuine duplication. Two tables named `approval_step` exist
in one database — one Hibernate-owned and quotation-scoped, one schema.sql-owned and
request-scoped. The UI quote flow drives the first; the staleness machinery drives the
second. A production consolidation would keep one table and add the version hash to it.
This document states the duplication rather than presenting it as a feature.

### 10.5 governance-engine's role

```
POST /api/quotes/{id}/evaluate    → GovernanceService.evaluate
GET  /api/quotes/{id}/evaluations → history
```

`GovernanceService.evaluate` does exactly three things:

1. `GovernanceDataClient.fetchDiceDecision(quotationId)` — ask quotation-service.
2. Map the returned decision onto `RequiredLevel` and a chain.
3. Persist a `GovernanceEvaluation` row and return an `EvaluationResponse`.

The class carries a delegation comment at the top making the non-scoring contract
explicit to the next reader. `approval-engine` depends on this contract: it asks
governance what level is required and gets D.I.C.E.'s answer, one hop removed.

The value governance adds is **temporal**: it keeps a persisted history of evaluations
over time, which the live engine (being stateless) does not.

---
---

# Page 11

## 11. Workflow C — negotiation, counter-offers, and approval staleness

### 11.1 The negotiation surface

`negotiation-engine` (`:8086`, Node) is the customer's voice in the system.

```
GET  /api/negotiations/{quotationId}/events
GET  /api/negotiations/{quotationId}/versions
POST /api/negotiations/{quotationId}/comments          { lineId, message }
POST /api/negotiations/{quotationId}/change-requests   { message }
POST /api/negotiations/{quotationId}/counter-discount  { lineId, proposedDiscountPercent, message }
```

Structure: `routes/negotiations.js` → `services/negotiationService.js`, with
`quotationClient.js` (mutate the quote) and `approvalClient.js` (invalidate stamps).
Tables: `negotiation_event` (the conversation) and `quote_negotiation_version` (the
positions).

Comments and change-requests are conversational — they record intent without touching
numbers. Counter-discount is the one that moves money.

### 11.2 The counter-offer chain

```
Customer portal (CustomerQuotationDetail.jsx)
   │  POST /api/negotiations/{id}/counter-discount
   ▼
negotiation-engine
   ├─ write negotiation_event
   ├─ write quote_negotiation_version
   ├─ quotationClient → POST /api/quotations/{id}/counter-discount
   └─ approvalClient  → POST /api/approvals/by-quotation/{id}/invalidate
```

`QuotationService.applyCounterDiscount(id, lineId, proposedDiscountPercent, reason, actor)`
performs, in one transaction:

1. `assertCustomerAccess` — the customer must own the quote.
2. Legality check — the quote must be live (not `COMPLETED`, not past `ORDERED`).
3. Update the target line's `discountPercent`.
4. Recompute all totals and margin via `QuotationCalculator`.
5. `stage = NEGOTIATION`.
6. **Delete the local `approval_step` rows.** The chain that was in flight described
   different numbers.
7. **`customerAccepted = false`.** Acceptance was of the old quote.
8. `logAudit(action = "COUNTER", reason)`.

### 11.3 Auto-accept of minor concessions

Not every counter deserves a round trip. When the countered quote still evaluates cleanly
under D.I.C.E. — no ceiling breach, margin intact, value under authority — the system
can re-run `submitForApproval` and land at `APPROVED` (and at `ORDERED` if the customer
had accepted) without a human touching it.

The important property: **there is no separate "auto-accept rule."** The counter simply
produces a new quote state, that state is scored by the same engine with the same
thresholds, and the same auto-approve logic applies. A concession is "minor" precisely
when the resulting quote is still in policy. Nothing special is needed to define
minor-ness, and there is no second policy to keep in sync.

### 11.4 Staleness — the mechanism

Steps 6 and 7 above kill the *current* chain. The version hash handles the *completed*
one:

```
t0  Quote Q-1042: Services line at 8%, Hardware at 4%.
    D.I.C.E. → GATE, chain [Sales Manager].
    approval-engine creates approval_request with hash H1.

t1  Manager approves. Local chain complete → stage APPROVED.
    approval_request status APPROVED, hash still H1.

t2  Customer counters: Services 8% → 16%.
    applyCounterDiscount → stage NEGOTIATION, local steps deleted,
    customerAccepted cleared. Quote's live hash is now H2.

t3  approval_request(H1) ≠ live(H2).  The approval is detectably stale.
    Re-submission runs D.I.C.E. fresh on the 16% quote — which now breaches
    the Silver services ceiling and requires review again.
```

Without the hash, step t3 depends on someone remembering to invalidate. With it,
staleness is a computed property of the data. The explicit
`/api/approvals/by-quotation/{id}/invalidate` call is belt-and-braces: it marks the
request invalid immediately rather than waiting for a reader to notice the mismatch.

### 11.5 Why counters cannot be laundered into approval

The invariant the whole workflow protects:

> **No quote can reach `APPROVED` with numbers that were not evaluated by D.I.C.E. in
> their current form.**

Every mutation path — counter-discount, draft update, line edit — either forces
`NEGOTIATION`/`DRAFT` (which requires re-submission, which re-runs D.I.C.E.) or is
rejected outright because the quote is no longer mutable. There is no edit endpoint that
leaves a quote in `APPROVED` with changed numbers.

---
---

# Page 12

## 12. Workflow D — deal snapshot and order conversion

### 12.1 Why a deal exists between quote and order

A quotation is a live, mutable, negotiable document. An order is a commitment. The `deal`
sits between them and holds the **immutable snapshots** that make the commitment
auditable: what exactly was agreed, at what prices, on what date.

`deal-engine` (`:8083`, Java) owns:

```
deal               id, quotation_id, status (DealStatus), owner, created_at, lost_reason
quote_version      id, deal_id, version_no, snapshot totals, reason, created_at
quote_version_line id, quote_version_id, product_id, name, quantity, unit_price, discount, subtotal
sales_order        id, deal_id, quotation_id, customer_id, total, status, created_at
order_line         id, order_id, product_id, name, quantity, unit_price, subtotal
```

### 12.2 API

```
GET  /api/deals
POST /api/deals                       { quotationId }
GET  /api/deals/{id}
POST /api/deals/{id}/snapshot         { reason }
GET  /api/deals/{id}/versions
POST /api/deals/{id}/lost             { reason }
POST /api/deals/{id}/convert-to-order
GET  /api/deals/{id}/orders
GET  /api/orders/{id}
```

### 12.3 `createDeal` and `snapshot`

```java
public Deal createDeal(Long quotationId, String bearerToken, String username)
public QuoteVersion snapshot(Long dealId, String bearerToken, String reason)
```

`createDeal` fetches the live quote through `QuotationServiceClient` — propagating the
caller's bearer token, so the caller's own visibility rules apply — and records the deal
plus an initial `QuoteVersion`.

`snapshot` can be called again at any point, producing version 2, 3, … each with a
reason. This is how negotiation history is preserved on the commercial side: the deal
accumulates a versioned record of every position the quote passed through.

### 12.4 `convertToOrder` — the single conversion path

```java
public Order convertToOrder(Long dealId, String bearerToken, String username)
```

The defining behaviours:

1. **Re-fetch the live quote.** The snapshot is the historical record; the order is built
   from current truth. If the quote changed since the last snapshot, the order reflects
   the change — or the stage check below refuses.
2. **Stage gate.** The quote must be `APPROVED` or `ORDERED`. Any other stage is a `409`.
   `deal-engine` will not manufacture an order from a `DRAFT` or `NEGOTIATION` quote,
   even if a caller asks nicely.
3. **Build order + lines** from the re-fetched quote.
4. **Persist and return.**

This is the *only* code path that produces a `sales_order`. There is no admin shortcut,
no direct order-creation endpoint, no seeding path in normal operation. Every order in
the database traces back through a deal to an approved quote — and through that quote's
`audit_event` rows to the D.I.C.E. reasons that permitted it.

### 12.5 Interaction with the quote spine

Recall from §9.4: `quotation-service` calls `createDeal` + `convertToOrder` inside its
own transaction when a quote reaches `ORDERED`. The stage gate in step 2 above means
these two services agree on the precondition from both sides — quotation-service will
only call when transitioning to `ORDERED`, and deal-engine will only comply when the
quote reads `APPROVED` or `ORDERED`. Neither trusts the other to have checked.

### 12.6 Deal loss

```
POST /api/deals/{id}/lost { reason }
```

`markLost` sets the deal status and records the reason. Critically, it does **not** delete
the quote, the versions, or the audit trail. A lost deal is data: it feeds win/loss
analysis, and its version history shows exactly which concession was on the table when
the customer walked.

### 12.7 Order visibility

```java
listMine(actor)                  // customer's own orders
getOrderVisibleTo(id, actor)     // 403 on ownership mismatch
assertOwnsOrder(order, actor)
assertOwnsDeal(deal, actor)
```

The same customer-isolation discipline as `quotation-service`, implemented independently
in deal-engine — because a service that can be reached directly must defend itself
directly.

---
---

# Page 13

## 13. Workflow E — fulfillment planning and inventory reservation

This is where the system's strongest correctness guarantee lives.

### 13.1 The two-phase design

Fulfillment deliberately separates **proposing** a warehouse split from **committing** it.

| Phase | Endpoint | Touches stock? | Status |
|---|---|---|---|
| Propose | `POST /api/fulfillment/orders/{orderId}/propose` | **No** — reads availability only | `PROPOSED` |
| Accept | `POST /api/fulfillment/plans/{id}/accept` | **Yes** — reserves | `CONFIRMED` |
| Override | `POST /api/fulfillment/plans/{id}/override` | **Yes** — reserves exactly as specified | `CONFIRMED` |

The reason for the split: a human should be able to look at a proposed split, disagree,
and change it — without the act of looking having locked stock that another order needed.

### 13.2 `proposePlan` — read-only

```java
public FulfillmentPlan proposePlan(Long orderId, String bearerToken) {
    OrderDto order = client.fetchOrder(orderId, bearerToken);
    FulfillmentPlan plan = plans.findByOrderId(orderId).orElseGet(FulfillmentPlan::new);
    plan.setOrderId(orderId);
    plan.setStatus("PROPOSED");
    plan.getLines().clear();
    for (OrderDto.Line line : order.lines)
        allocateLines(plan, line.productId, line.productName, round(line.quantity), bearerToken);
    recomputeTotals(plan);
    return plans.save(plan);
}
```

Note `orElseGet(FulfillmentPlan::new)` combined with `lines.clear()` — re-proposing an
order replaces the previous proposal rather than accumulating stale lines. Shipping cost
uses a weight heuristic of ₹50/kg in `recomputeTotals`.

### 13.3 `acceptPlan` — the re-derivation

The critical comment in the source: *"Re-derives the plan's lines from what
inventory-engine actually grants, since stock may have moved since the proposal was
shown."*

```java
// 1. Collapse the proposal to per-product quantities — the warehouse split in the
//    proposal is advisory and may no longer be achievable.
Map<Long, int[]> requestedByProduct = …;   // merged across plan lines

// 2. Discard the proposed lines entirely.
plan.getLines().clear();
String orderRef = "ORDER-" + plan.getOrderId();

// 3. For each product, ask inventory to reserve — and rebuild lines from the ANSWER.
for (entry : requestedByProduct) {
    ReservationResultDto result = client.reserveStock(orderRef, productId, qty, bearerToken);
    for (Reservation r : result.reservations)
        addLine(plan, productId, name, r.warehouseId, warehouseNames.get(r.warehouseId), r.quantity, …);
    if (result.backorder != null)
        addBackorderLine(plan, productId, name, result.backorder.quantity);
}
plan.setStatus("CONFIRMED");
```

The plan that gets saved describes **reality**, not intent. If the proposal said
"40 from Chennai" but Chennai now has 25, the confirmed plan reads 25 from Chennai, 15
from wherever inventory found them, plus a backorder line for any remainder. The plan is
never a promise the warehouse cannot keep.

### 13.4 `overridePlan` — validated, not trusted

A human specifies exact warehouse assignments. The system does two things:

**Pre-flight, whole-plan validation.** Every line is checked against current availability
*before* any line is committed:

```java
for (OverrideRequest.OverrideLine line : request.getLines()) {
    StockCheckDto stock = client.checkStock(line.getProductId(), bearerToken);
    int availableAtWarehouse = stock.byWarehouse.stream()
        .filter(w -> w.warehouseId.equals(line.getWarehouseId()))
        .findFirst().map(w -> w.available).orElse(0);
    if (line.getQuantity() > availableAtWarehouse)
        throw new ResponseStatusException(CONFLICT,
            "Override rejected: warehouse " + … + " only has " + availableAtWarehouse + …);
}
```

An invalid override fails **as a whole** rather than partially applying — no half-committed
plan to unwind.

**Commit through the same atomic path.** Each line then goes through
`reserveExact(orderRef, warehouseId, productId, quantity)`, which uses the identical
conditional update as the automatic path. Quoting the source: *"this is the backend
validation the override must go through, not a client-side assumption."* A manual
override cannot oversell, no matter what the operator believed.

### 13.5 `reserveStock` — how overselling is made impossible

```java
public ReservationResult reserveStock(String orderRef, Long productId, int quantity) {
    List<Inventory> rows = inventory.findByProductIdOrderByWarehouseIdAsc(productId);
    if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, …);

    // Preference: largest-available warehouse first, to minimise shipment fragmentation.
    List<Long> pickOrder = rows.stream()
        .sorted(Comparator.comparingInt(Inventory::getAvailable).reversed())
        .map(Inventory::getWarehouseId).toList();

    int remaining = quantity;
    List<InventoryReservation> created = new ArrayList<>();

    for (Long warehouseId : pickOrder) {
        while (remaining > 0) {
            Inventory current = inventory.findByWarehouseIdAndProductId(warehouseId, productId).orElseThrow();
            int take = Math.min(remaining, current.getAvailable());
            if (take <= 0) break;                    // this warehouse is exhausted

            int updated = inventory.tryReserve(warehouseId, productId, take);
            if (updated == 0) continue;              // lost the race — re-read and retry

            created.add(reservations.save(new InventoryReservation(orderRef, productId,
                                              warehouseId, take, "ACTIVE")));
            remaining -= take;
        }
        if (remaining <= 0) break;
    }

    Backorder backorder = (remaining > 0) ? createBackorder(orderRef, productId, remaining) : null;
    return new ReservationResult(created, quantity, quantity - remaining, backorder);
}
```

**`tryReserve` is the guarantee.** It is a JPQL `@Modifying` conditional update in
`InventoryRepository`:

```java
@Modifying(clearAutomatically = true)
@Query("update Inventory i set i.quantityReserved = i.quantityReserved + :take " +
       "where … and (i.quantityOnHand - i.quantityReserved) >= :take")
int tryReserve(Long warehouseId, Long productId, int take);
```

The availability predicate is **inside the UPDATE's WHERE clause**. The database
evaluates the check and performs the write in one atomic statement under row locking.
There is no read-then-write window for two transactions to both pass.

The return value is the row count. `0` means another transaction consumed those units
between our read and our write. The response is not to fail and not to proceed — it is to
`continue`, re-read current availability, and try again with fresh numbers. The source
comment is precise about this: *"each failed attempt means a concurrent caller won the
race for those units, so we re-read current availability and try again rather than giving
up or overselling."*

And the ordering disclaimer, equally precise: *"This is just a preference order —
correctness under concurrency comes from tryReserve's atomic conditional update, not from
this ordering."* Sorting by largest-available is a shipping-efficiency heuristic. Remove
it and the system is slower to converge but still cannot oversell.

### 13.6 Shortfall handling

Whatever cannot be reserved becomes a `Backorder`. The reservation result is honest about
the split: `requested`, `reserved`, `reservations[]`, `backorder`. Nothing silently
disappears, and the fulfillment plan surfaces the backorder as its own line so the
customer-facing view shows it too.

`consolidateBackorder(productId)` sweeps outstanding backorders for a product when stock
arrives (typically triggered by an OEEG `stock.replenished` event — §15) and converts
what it can into active reservations.

### 13.7 Reservation lifecycle

```
reserveStock / reserveExact  →  InventoryReservation(status = ACTIVE)
allocateStock(reservationId) →  WarehouseAllocation  (picked for shipment)
releaseStock(reservationId)  →  status RELEASED, quantity_reserved decremented
```

Release uses a native query with `greatest(0, quantity_reserved - :qty)`, so a
double-release cannot drive reserved quantity negative — the same defensive posture as
the reserve path, applied in the opposite direction.

---
---

# Page 14

## 14. Workflow F — billing, recommendations, and deal health

### 14.1 Billing

`billing-engine` (`:8091`, Node): `routes/billing.js` → `services/billingService.js`,
over `invoice`, `invoice_line`, `subscription`, `billing_schedule`, `credit_note`,
`refund`.

| Method | Path | Finance-only |
|---|---|---|
| GET | `/api/billing/orders/{orderId}` | no |
| POST | `/api/billing/orders/{orderId}/initialize` `{ lines }` | no |
| POST | `/api/billing/orders/{orderId}/run-recurring` | **yes** |
| POST | `/api/billing/orders/{orderId}/credit-notes` `{ amount, reason, subscriptionId? }` | **yes** |
| POST | `/api/billing/subscriptions/{id}/change-quantity` `{ newQuantity }` | **yes** |
| POST | `/api/billing/subscriptions/{id}/cancel` `{ reason }` | **yes** |

The read/initialize split from the Finance-gated mutations is the point: sales can see
and set up billing for an order; only Finance can issue credit notes, change subscription
quantities, cancel, or run a recurring cycle. Money leaving the company is a Finance
action.

Subscriptions come from `subscription_plan` in the admin catalog, so the same console
that defines discount policy defines recurring-revenue products.

`credit_note` and `refund` are separate tables because they are separate events: a credit
note adjusts what is owed; a refund moves money that was already collected.

### 14.2 Recommendations — two engines, two purposes

There are two recommendation surfaces, and they are not redundant.

**In-quote recommendations** — `GET /api/recommendations?productIds=` on
**quotation-service** `:8082`. Blends:

- `recommendation_rule` (admin-authored: "attach this warranty to that hardware")
- `CoPurchaseStats` — observed pairing confidence computed from historical quote lines
  via `CoPurchaseRepository`

The blend matters. Rules encode what the business *wants* attached; co-purchase encodes
what customers *actually* buy together. A rule with no observational support is still
shown (policy), and a strong observed pairing with no rule is still shown (reality).

**Standalone ranking** — `GET /api/recommendations/rank?productIds=&minMargin=` on
**recommendation-engine** `:8089` (`services/rankingService.js`). A pure ranking helper
with a margin filter, usable outside the quote context.

### 14.3 Deal health

`deal-health-engine` (`:8090`, Node) is strictly read-only. `services/clients.js` fans
out; `services/healthService.js` aggregates.

```
GET /api/deal-health/dashboard          → portfolio view
GET /api/deal-health/{quotationId}      → single-deal health
```

It reads from quotation-service, approval-engine, negotiation-engine, and
inventory-engine, and answers questions no single service can:

- Which approved deals are blocked on stock?
- Which quotes have been in `NEGOTIATION` longest?
- Which approvals are stale (hash mismatch) but still presented as approved?
- Where is the pipeline value concentrated by stage?

This is a **read model** in the CQRS sense — a projection assembled at query time from
several write models. It owns no tables and can be deleted without data loss, which is
exactly the property you want from an aggregation service. Rendered by
`pages/admin/DealHealthDashboard.jsx`.

### 14.4 Tasks and notifications

`data-service` owns `task` and `notification` (indexed by `username`), surfaced through
`pages/workspace/Tasks.jsx` and `pages/workspace/Notifications.jsx`. These are the
system's nudges: a quote returned for revision, an approval waiting, a backorder cleared.

### 14.5 Analytics and reporting

`AnalyticsController` on the login service (`GET /api/admin/analytics/summary`, ADMIN and
SALES_MANAGER) backs `pages/admin/Analytics.jsx`. `pages/admin/Reports.jsx` plus
`lib/pdfReport.js` generate client-side PDFs, so exporting a report requires no
server-side rendering pipeline.

### 14.6 Monitoring

`monitor-service` (`:8094`, single-file Node) and `monitor-dashboard` (separate Vite app)
provide an ops view. Explicitly **off the quote path** — nothing in the quote-to-cash
flow depends on the monitor being up.

---
---

# Page 15

## 15. Workflow G — OEEG event ingestion and the Odoo boundary

### 15.1 What OEEG is for

Demonstrating "our system reacts to ERP events" normally requires an ERP. OEEG (Odoo
Event Emulator Gateway, `:8092`, Node) removes that dependency by generating Odoo-shaped
event envelopes and delivering them to the real ingest path. The ingest code that runs in
a demo is the same ingest code that would run against a live Odoo. Only the event source
differs.

The framing to hold onto: **OEEG emits. D.I.C.E. decides.** OEEG has no thresholds, no
scoring, and no write access to the quote spine except through the webhook.

### 15.2 The four scenarios

| Event | Odoo model | Business meaning |
|---|---|---|
| `stock.replenished` | `stock.quant` | Inventory arrived — backorders may now be fillable |
| `account.payment_posted` | `account.payment` | Customer paid — billing state advances |
| `stock.picking_done` | `stock.picking` | Goods shipped — fulfillment advances |
| `sale.order_confirmed` | `sale.order` | ERP confirmed the order — reconcile |

### 15.3 OEEG API

```
GET  /api/oeeg/health              → { liveOdooRpc, webhookTarget }
GET  /api/oeeg/scenarios           → the four, with descriptions
POST /api/oeeg/scenarios/{event}   → fire one
GET  /api/oeeg/poller              → poller status
POST /api/oeeg/poller              → enable/disable/configure
POST /api/oeeg/poller/run-once     → single tick on demand
POST /api/oeeg/odoo/execute-kw     → raw JSON-RPC passthrough
```

Optional fire body: `{ quotationId, orderId, productId, warehouseId, quantity, amount, alsoCallLiveOdoo }`.

`execute-kw` is a **no-op unless `DICE_ODOO_ENABLED=true`**. The live-Odoo path exists in
code (`src/odooRpc.js`) but is off by default, so a demo cannot accidentally reach a real
ERP.

### 15.4 The webhook envelope

```json
{
  "event": "stock.replenished",
  "odooModel": "stock.quant",
  "quotationId": 1,
  "orderId": null,
  "payload": { "productId": 1, "warehouseId": 1, "quantity": 10 },
  "source": "oeeg"
}
```

Delivered as `POST :8082/api/webhooks/odoo` with header `X-OEEG-Key: oeeg-demo-key`.

### 15.5 Ingest — the only unauthenticated-by-JWT write path

`OdooWebhookController` is `permitAll` at the Spring Security layer, because an ERP has
no user session and no JWT to present. The key check happens **inside the controller**:
the `X-OEEG-Key` header must match the configured value or the request is rejected.

`DiceOdooIngestService` then:

1. Validates the envelope and resolves the referenced quotation/order.
2. Applies the event's effect (e.g. a replenishment may trigger
   `consolidateBackorder(productId)`).
3. **Optionally re-evaluates the quote through D.I.C.E.** — the ERP event is an *input*
   to the decision, never a decision.
4. Writes an `audit_event` row with `action = DICE`, so ERP-triggered changes appear in
   the same audit stream as everything else.

Step 4 is the whole design in one line: an ERP event and a rep's discount slider both
end up as reasoned rows in the same trail.

### 15.6 The poller — from button to background process

`oeeg/src/poller.js` upgrades OEEG from a demo button to something that runs on its own.
The header comment states both modes:

- **Live** (`DICE_ODOO_ENABLED=true`): each tick asks Odoo which records of the watched
  models changed since the last watermark, and emits one D.I.C.E. event per changed
  record.
- **Emulated** (default): with no Odoo to ask, each tick replays the configured
  scenarios — exercising the ingest path end-to-end without anyone clicking.

Configuration and guards:

| Env var | Default | Note |
|---|---|---|
| `OEEG_POLL_ENABLED` | `false` | **Disabled by default — nothing polls unless switched on** |
| `OEEG_POLL_INTERVAL_MS` | 60000 | Floored at `MIN_INTERVAL_MS = 5000` |
| `OEEG_POLL_SCENARIOS` | `stock.replenished` | Comma-separated; unknown names filtered out |
| `OEEG_POLL_QUOTATION_ID` | — | Target for emitted events |
| `OEEG_POLL_ORDER_ID` | — | Target for emitted events |

State tracked per poller: `watermark` (Odoo-format timestamp), `running`, `ticks`,
`emitted`, `lastTickAt`, `lastError`, `lastResults`. Exposed at `GET /api/oeeg/poller`,
so the dashboard can show that the background loop is alive and what it last did.

Three safety properties worth calling out: off by default; a 5-second interval floor that
an env typo cannot undercut; and scenario-name filtering at construction, so a
misconfigured watch list yields fewer events rather than a crash loop.

### 15.7 Gateway exposure

```
/api/oeeg/**  →  Bearer required; ADMIN unless GATEWAY_DEMO_OEEG=true
```

The `GATEWAY_DEMO_OEEG` escape hatch lets a demo operator fire scenarios without an admin
token. It is a demo affordance and is named to say so.

### 15.8 The rule, restated

The gateway must never route a D.I.C.E. decision *through* OEEG. Events flow
OEEG → quotation-service. Decisions happen in quotation-service. The `oeeg-dashboard`
Vite app is a control surface for the emitter, not a control surface for policy.

---
---

# Page 16

## 16. Frontend architecture and the three consoles

### 16.1 Stack and shape

React + Vite (`frontend/`), served in dev on `:5173` and built into static assets served
by Nginx in production. Two additional Vite apps — `oeeg-dashboard` and
`monitor-dashboard` — are separate builds for separate audiences.

```
src/
  main.jsx · App.jsx · AuthContext.jsx · ProtectedRoute.jsx · toast.js
  api.js · dealFlowApi.js · quotationApi.js · negotiationApi.js · workspaceApi.js
  components/  AsyncState · AuthShell · Badge · PasswordField · ToastContainer
  lib/         customerStatus.js · pdfReport.js
  pages/
    Login · Signup · ForgotPassword · ResetPassword · Portal · Unauthorized
    workspace/  WorkspaceLayout · WorkspaceContext · Pipeline · Quotations ·
                QuotationBuilder · Customers · Tasks · Notifications
    admin/      AdminLayout · Analytics · ApprovalQueue · ApprovalReview · Billing ·
                CrudTable · Customers · DealHealthDashboard · DiscountPolicies ·
                Fulfillment · PriceLists · Products · RecommendationRules · Reports ·
                SubscriptionPlans · Warehouses
    customer/   CustomerLayout · CustomerDashboard · CustomerQuotations ·
                CustomerQuotationDetail · CustomerOrders · CustomerOrderDetail ·
                CustomerProfile
```

### 16.2 Five API modules, one per bounded context

`api.js` (auth/base), `quotationApi.js`, `dealFlowApi.js`, `negotiationApi.js`,
`workspaceApi.js`. Each wraps a service's surface. All target the gateway origin; none
knows a service port. Changing which port `quotation-service` listens on requires no
frontend change at all.

### 16.3 Auth in the browser

`AuthContext.jsx` holds the access token in memory. It is deliberately *not* in
`localStorage` — a token in `localStorage` is readable by any injected script. The
refresh token lives in an httpOnly cookie the JavaScript cannot read. The consequence is
that a page refresh loses the in-memory access token and silently re-acquires one via
`/api/auth/refresh`, which is the intended flow.

`ProtectedRoute.jsx` gates routes by role and redirects to `Unauthorized.jsx` on a
mismatch. This is UX, not security: it stops a user from navigating somewhere useless.
The gateway and the services enforce the actual boundary.

### 16.4 The three consoles

**Sales workspace** (`SALES_REP`, `SALES_MANAGER`)

`Pipeline.jsx` is the Kanban across the seven stages, cards coloured by `riskScore` —
which is available because D.I.C.E. runs at creation, not only at submission.
`QuotationBuilder.jsx` is the core screen: line editing, live totals, cart
recommendations, and a **live risk preview** driven by `POST /api/quotations/risk-preview`
that shows the D.I.C.E. consequence of a discount before the rep commits to it.

**Admin console** (`ADMIN`, plus `SALES_MANAGER` / `FINANCE` on specific pages)

`CrudTable.jsx` is a generic table component reused by Products, PriceLists, Warehouses,
SubscriptionPlans, RecommendationRules, and Customers — one implementation of the
grid/edit/delete pattern rather than seven. `DiscountPolicies.jsx` edits the
(tier, category) ceilings D.I.C.E. reads. `ApprovalQueue.jsx` batches decision reasons
through `GET /api/dice/decisions?ids=`. `Fulfillment.jsx` drives propose → accept →
override. `DealHealthDashboard.jsx` renders the aggregation.

**Customer portal** (`CUSTOMER`)

Own quotes and orders, accept-as-is, counter a line, comment. Margin and risk are absent
from these views — not hidden with CSS, but stripped server-side by
`sanitizeForCustomer`. `lib/customerStatus.js` maps internal stage/status pairs onto
customer-appropriate language: a customer sees "Under review," not
`PENDING_APPROVAL / GATE`.

### 16.5 Shared UX primitives

`AsyncState.jsx` standardises loading/error/empty rendering, so every list behaves the
same way when a service is slow. `ToastContainer.jsx` + `toast.js` centralise
notifications. `Badge.jsx` renders stage and risk chips consistently. `AuthShell.jsx`
wraps the auth pages. `PasswordField.jsx` handles show/hide and strength affordances in
one place.

---
---

# Page 17

## 17. Configuration, operations, and local run procedure

### 17.1 Environment variables

**Gateway**

| Var | Compose value | Purpose |
|---|---|---|
| `PORT` | 8000 | Listen port |
| `JWT_SECRET` | `dev-only-insecure-secret-change-me-at-least-32-bytes-long` | Must equal `app.jwt.secret` in every Java service |
| `CORS_ORIGINS` | `http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:5173,http://localhost:5175` | Comma-separated allowlist |
| `REDIS_URL` | `redis://redis:6379` | Rate-limit store |
| `SERVICE_*` | `http://host.docker.internal:<port>` | 13 upstream URLs |
| `OEEG_WEBHOOK_KEY` | `oeeg-demo-key` | Webhook guard |
| `GATEWAY_DEMO_OEEG` | unset | `true` relaxes OEEG routes from ADMIN-only |

**Data service** — `PORT=8093`,
`DATABASE_URL=postgres://loginuser:loginpass@host.docker.internal:5433/dealflow`,
`DATA_SERVICE_KEY=data-demo-key`.

**Postgres** — `POSTGRES_USER=loginuser`, `POSTGRES_PASSWORD=loginpass`,
`POSTGRES_DB=dealflow`, volume `dealflow_pg`, healthcheck `pg_isready` every 5s ×20.

**OEEG** — `DICE_ODOO_ENABLED` (default false), `OEEG_POLL_ENABLED` (default false),
`OEEG_POLL_INTERVAL_MS`, `OEEG_POLL_SCENARIOS`, `OEEG_POLL_QUOTATION_ID`,
`OEEG_POLL_ORDER_ID`.

**Java services** — `app.jwt.secret` (identical across all six), JDBC URL to `:5433`,
`spring.jpa.hibernate.ddl-auto=update`, peer service URLs for `client/` classes.

Each Node engine ships a `.env.example` alongside its `.env`.

### 17.2 Starting the system

```bash
cd /home/sanjeev/dice
./start-all.sh          # data plane, compile, engines, frontends
```

What it does, in order: `docker compose up -d postgres redis`; compile all six Java
services with `mvn -q -o compile` and **abort on any failure**; start the six Java
services; start the seven Node services; start the three Vite apps. `kill_port` runs
before each start, so re-running is safe. `wait_port` gives a 60×2s readiness budget.

Full compose stack (gateway, nginx, data-service too):

```bash
docker compose up -d
```

### 17.3 Seeding a demo

```bash
./demo-seed.sh
```

Idempotent — safe to run repeatedly. `docs/demo-runbook.md` is the accompanying script
for a live walkthrough.

### 17.4 Verification

```bash
curl -s localhost:8000/health
# {"status":"ok","engine":"D.I.C.E.","emulator":"OEEG"}

curl -s localhost:8000/metrics | grep gateway_http_requests_total
open http://localhost:8000/documentation      # OpenAPI UI
open http://localhost                         # Nginx-served SPA
```

Per-service logs: `logs/<service>.log` (`backend.log`, `quotation-service.log`,
`gateway.log`, …).

### 17.5 Operational runbook

| Symptom | First check |
|---|---|
| `401` on everything | `JWT_SECRET` in the gateway vs `app.jwt.secret` in the Java services |
| `403` on a route that should work | Gateway `requireRoles` first, then the service's own rule — they are separate |
| Java service will not start | `logs/<svc>.log`; usually a port already bound or Postgres not ready |
| Node engine 500s on every request | data-service reachable? `DATA_SERVICE_KEY` matching? |
| OEEG events do nothing | `X-OEEG-Key` match; is the webhook target the right host/port? |
| Ceiling change not applying | Wait 5s (`ThresholdConfig` cache TTL) and retry |
| Transition rejected with 409 | Check `PipelineStage.canTransitionTo` for the pair |
| `ORDERED` transition fails | `deal-engine` down — the transaction rolls back by design (§9.4) |
| Fulfillment accept yields less than proposed | Correct behaviour: stock moved; check the backorder line |

### 17.6 Tuning D.I.C.E. without a deploy

Edit `governance_threshold` rows. Within 5 seconds the next evaluation uses the new
values. Useful demonstrations:

- `auto_approve_risk` 40 → 25: more quotes gate.
- `audit_band_width` 10 → 0: **disables the audit band** entirely; every auto-approval is
  a plain `AUTO`.
- `ceiling_service_cap` 10 → 5: services tighten across every tier at once.
- `deal_value_finance` ₹50L → ₹10L: Finance appears in far more chains.

### 17.7 Demo secrets

`change-this-demo-secret…`, `data-demo-key`, `oeeg-demo-key`, `loginpass` are all
hackathon-local and committed intentionally so the stack starts with zero configuration.
In production these are vault-issued, rotated, and never in the repository. Stating this
plainly is more useful than pretending otherwise.

---
---

# Page 18

## 18. Failure modes, consistency guarantees, and known limitations

### 18.1 What the system actually guarantees

| # | Guarantee | Mechanism | Strength |
|---|---|---|---|
| 1 | No overselling | `tryReserve` conditional UPDATE | **Strong** — database-enforced |
| 2 | Quote and order never disagree | Shared transaction in `openAndConvertDeal` | **Strong** — while deal-engine is reachable |
| 3 | No illegal stage transition | `PipelineStage.canTransitionTo` server-side | **Strong** |
| 4 | Approved numbers were D.I.C.E.-evaluated | Every mutation forces re-submission | **Strong** |
| 5 | Every decision is explained | Per-reason `audit_event` rows | **Strong** |
| 6 | Customers cannot see margin or risk | `sanitizeForCustomer` + claim scoping | **Strong** |
| 7 | Stale approvals are detectable | `quote_version_hash` | **Medium** — detection requires a reader |
| 8 | Policy changes apply promptly | 5s threshold cache | **Eventual** — bounded at 5 seconds |

### 18.2 Failure analysis by component

**deal-engine down.** Quotes cannot transition to `ORDERED`; the transaction rolls back
and the quote stays `APPROVED`. Everything else — creation, scoring, approval,
negotiation — continues. *Chosen failure mode: refuse rather than diverge.*

**inventory-engine down.** Fulfillment propose and accept both fail. Orders still exist;
plans cannot be made. No partial reservations, because the reserve call is what creates
them.

**data-service down.** All Node engines lose persistence: approvals, negotiations,
billing, tasks, notifications. The Java core — quotes, D.I.C.E., deals, inventory,
fulfillment — is unaffected, because it holds its own JDBC connections. This is the
single largest blast radius in the system and is called out as such.

**governance-engine down.** `approval-engine` cannot learn the required level. The
quotation-service local chain is unaffected, so the primary UI approval flow still works.

**oeeg down.** Nothing in the quote path is affected. By design.

**Redis down.** Rate limiting degrades. Depending on the client's failure policy this
either fails open (requests pass unlimited) or closed (requests rejected). Worth pinning
explicitly in a production configuration.

**Postgres down.** Total outage. Single database, no replica.

### 18.3 Known limitations, stated plainly

**1 — Distributed transactions over HTTP.** §9.4's shared transaction is correct for
consistency and wrong for availability. Holding a database transaction across two network
calls means `deal-engine` latency becomes `quotation-service` lock duration. The
production shape is an outbox row committed with the stage change plus an async worker
that converts, with the quote briefly in `ORDERED_PENDING_CONVERSION`.

**2 — Two `approval_step` tables.** Documented at §10.4. Genuine duplication; one table
with a version-hash column is the consolidation.

**3 — `ddl-auto=update` in place of migrations.** Hibernate will add columns but will not
drop or safely alter them. There is no rollback, no reviewable schema diff, and no way to
reason about what a deployment will do to production data. Flyway or Liquibase is the
answer.

**4 — No message bus.** Every cross-service interaction is synchronous HTTP. Retries are
GET-only at the gateway. There is no dead-letter queue, no replay, no at-least-once
delivery for the OEEG ingest path.

**5 — Node/Java split is historical.** The boundary between Java and Node services traces
team composition more than domain shape. `approval-engine` and `negotiation-engine`
manipulate the quote spine and are arguably in the same bounded context as
`quotation-service`.

**6 — Backorder consolidation is manual or event-triggered.** There is no scheduled
sweep; consolidation runs on a `stock.replenished` event or an explicit call.

**7 — `AtomicInteger` quote numbering.** `nextQuoteNo()` seeds at 1000 in process memory.
Two `quotation-service` instances would generate colliding quote numbers. A database
sequence is the fix, and it is a one-line change gated only on caring about horizontal
scale.

**8 — No idempotency enforcement.** The gateway allowlists an `Idempotency-Key` header in
CORS but no service consumes it. A double-submitted approval or conversion is not
deduplicated.

**9 — Customer pricing is snapshot-on-create.** Correct behaviour, but there is no
mechanism to notify a rep that a live quote's underlying list price has moved.

### 18.4 What is genuinely well-built

Balance requires stating this too. The inventory reservation loop is production-quality:
the conditional update, the retry-on-race, the honest partial result, the backorder
remainder, and the `greatest(0, …)` guard on release together handle concurrency
correctly under real contention. The D.I.C.E. rule ordering — additive escalation with a
single, heavily-guarded, conjunctive downgrade — is a sound way to structure a policy
engine. And the reason-per-audit-row decision means the system can always answer *why*,
which is the property that separates a decision engine from a black box.

---
---

# Page 19

## 19. Security posture and threat model

### 19.1 Trust zones

```
Zone 0  Public internet         → Nginx :80 only
Zone 1  Edge                    → Nginx (static, proxy, /metrics hidden)
Zone 2  Gateway                 → Fastify :8000 (JWT, coarse RBAC, rate limit)
Zone 3  Application services    → 13 services, each independently authenticating
Zone 4  Data                    → Postgres :5433, Redis :6380
Zone X  Never public            → mailer :4000
```

Nothing in Zone 3 or 4 should be reachable from Zone 0. In the current host-run
configuration, engine ports are bound on the host — acceptable for local development,
and the first thing to change for any shared deployment.

### 19.2 Threat coverage

| Threat | Control | Residual risk |
|---|---|---|
| Credential stuffing | `RateLimiter` + account lockout | Distributed attempts across accounts |
| Token theft via XSS | Access token in memory only; refresh httpOnly | XSS can still act as the user in-session |
| Token replay after logout | `revoked_tokens` keyed by `jti` | 15-min window if revocation is missed |
| CSRF on refresh/logout | `CsrfFilter` + `X-XSRF-TOKEN` | — |
| Horizontal privilege escalation (customer A reads customer B) | `customerId` claim forcing + `assertCustomerAccess` | Requires every new endpoint to remember; not structurally enforced |
| Vertical escalation (rep approves own quote) | `assertStepRole` against the pending step | `ADMIN` bypass is broad |
| Margin/risk disclosure | `sanitizeForCustomer` server-side | Fields must be added to the sanitiser as they are introduced |
| Webhook forgery | `X-OEEG-Key` shared secret | Static key, no rotation, no replay protection |
| SQL injection | Parameterised queries throughout; JPA/JPQL in Java | `data-service` `/internal/sql` is a broad surface |
| Direct service access bypassing the gateway | Every service verifies JWT independently | Ports are host-bound in dev |
| Metrics disclosure | Nginx hides `/metrics` | Direct `:8000/metrics` access is unguarded |
| Oversell as a business attack | Atomic conditional update | — |

### 19.3 Defense in depth, illustrated

Approving a quote as a `SALES_REP` requires defeating four independent checks:

1. Gateway `authGuard` — valid, unexpired, non-revoked JWT.
2. Gateway `requireRoles('SALES_MANAGER','FINANCE','ADMIN')` — role in the token.
3. Service `JwtAuthFilter` — the service re-verifies the same token itself.
4. Service `assertApprover(role)` **and** `assertStepRole(role, step)` — the role must
   match *this quote's current pending step*.

Check 4 is the one that cannot be satisfied by forging a role alone; it depends on
database state the attacker does not control.

### 19.4 The `/internal/sql` surface

`data-service` accepts parameterised SQL from Node engines, authenticated by
`DATA_SERVICE_KEY`. This is the sharpest edge in the system. Compromise of a single Node
engine — or of the key — yields arbitrary database access.

Mitigations present: the endpoint is not routed through the public gateway; queries are
parameterised; the key is required. Mitigations absent and worth adding: a statement
allowlist or named-query registry, per-caller keys so a compromise is attributable and
revocable individually, and query logging.

### 19.5 Production hardening checklist

- [ ] Vault-issued secrets; remove all `*-demo-key` values and the compose-inline JWT secret
- [ ] TLS at Nginx; `Secure` flag on the refresh cookie; HSTS
- [ ] Bind engine ports to loopback or a private network; expose only `:80`
- [ ] Per-caller `DATA_SERVICE_KEY`s plus a statement allowlist
- [ ] Rotate the OEEG webhook key; add HMAC signing and a replay window
- [ ] Narrow the `ADMIN` step-role bypass, or at minimum alert on its use
- [ ] Pin the Redis-down rate-limit policy explicitly (fail open or closed)
- [ ] Authenticate `/metrics` rather than relying on Nginx to hide it
- [ ] Replace `ddl-auto=update` with reviewed migrations
- [ ] Structured audit-log export to an append-only store
- [ ] Dependency and container scanning in CI

### 19.6 Audit and compliance posture

The `audit_event` table is the compliance artefact. For any quote it answers: who acted,
when, what the stage transition was, what reason was given, and — through the `DICE`
rows — every individual policy rule that fired and its computed contribution. Because
reason strings carry machine-parsable code prefixes (`MARGIN_FLOOR`, `CATEGORY_BLEND`,
`DEAL_VALUE`, `TIER_FAST_TRACK`, `POST_HOC_AUDIT`), the trail is queryable as data:
"show every quote auto-approved in the audit band last quarter" is a `LIKE 'POST_HOC_AUDIT%'`
query, not a manual review.

---
---

# Page 20

## 20. Evolution path and design retrospective

### 20.1 If this system had to run in production on Monday

Ordered by risk reduced per unit of work:

**1. Replace `ddl-auto=update` with Flyway.** Highest risk, lowest effort. Baseline the
current schema, then every change is a reviewed, versioned, rollback-planned migration.
Nothing else on this list is safe to do until this is done.

**2. Break the distributed transaction.** Commit an outbox row alongside the `ORDERED`
stage change; an async worker calls `deal-engine` and advances a
`ORDERED_PENDING_CONVERSION` state to `ORDERED`. Availability improves and consistency
becomes eventual-but-guaranteed instead of strong-but-fragile.

**3. Consolidate the approval surfaces.** One `approval_request` table carrying the
version hash. Delete the duplicate. `approval-engine` either absorbs the local chain or
is folded into `quotation-service`.

**4. Database sequence for quote numbers.** Removes the last barrier to running more than
one `quotation-service` instance.

**5. Harden `/internal/sql`.** Named queries or an allowlist; per-caller keys.

**6. Secrets to a vault; TLS at the edge; ports off the host.**

### 20.2 The architecture this would become

The current fourteen-process layout demonstrates bounded contexts. It is not the shape a
production system of this size should have. The honest target:

```
┌─────────────────────────────────────────────────────┐
│  Sales Core  (modular monolith)                     │
│    quotes · D.I.C.E. · approvals · negotiation ·    │
│    deals · orders · governance persistence          │
│    → one transaction boundary, one deploy           │
└─────────────────────────────────────────────────────┘
        │                              │
┌───────────────────┐    ┌──────────────────────────┐
│  Inventory &      │    │  Billing                 │
│  Fulfillment      │    │  (different cadence,     │
│  (locking, high   │    │   different compliance   │
│   write contention)│    │   requirements)          │
└───────────────────┘    └──────────────────────────┘
        │                              │
┌─────────────────────────────────────────────────────┐
│  ERP Integration (OEEG / real Odoo) — off hot path  │
└─────────────────────────────────────────────────────┘
```

Four deployables instead of fourteen. The splits that survive are the ones justified by
something real: **inventory** because row-level lock contention is a genuinely different
operational profile; **billing** because financial records have different retention and
audit requirements; **ERP integration** because it fails independently and must never
take the quote path down with it.

Everything else — quotes, scoring, approvals, negotiation, deals — is one transaction
boundary in disguise. The evidence is in the code: §9.4 already reaches for a shared
transaction across a service boundary, and §10.4 already has two tables trying to be one.
Both are the architecture telling you where the seam does not belong.

### 20.3 What would be built the same way again

**D.I.C.E. as a pure function.** `evaluate` reads and computes; it does not write, does
not transition, does not persist. That single decision is what makes dry-run endpoints,
the live risk preview in the builder, and the batched approval-queue reasons all possible
without a second implementation to drift.

**Reason-per-audit-row.** Storing eight rows instead of one JSON blob costs nothing and
makes the audit trail a queryable dataset rather than a document to read.

**Thresholds as data with a short cache.** Policy tunable at runtime, bounded staleness,
no config-read per line. The `audit_band_width = 0` disable switch is the kind of affordance
that only exists when configuration is designed rather than accumulated.

**The conditional UPDATE in inventory.** Correctness located in the database, where
concurrency is actually resolved, with the heuristic ordering explicitly documented as
*not* being the guarantee.

**Three approval bands.** The most genuinely novel piece. The binary auto-approve/gate
choice forces a trade between speed and oversight. `AUTO_WITH_AUDIT` refuses the trade:
the customer waits for nothing, and the reviewer still gets the list. It changed no gating
behaviour — it converted silence into signal.

### 20.4 Closing

DealFlow360's central bet is that discount policy should be **executed at the moment of
decision** rather than documented and audited afterwards. Everything in the architecture
follows from that bet: D.I.C.E. runs synchronously on the submission path because a
policy consulted after the fact is not a policy; every reason becomes a row because an
execution you cannot explain is not auditable; governance persists rather than re-scores
because two policies are worse than none; and inventory reserves atomically because a
promise the warehouse cannot keep is a policy failure of exactly the same kind, one step
downstream.

The system has real limitations, enumerated in §18 rather than hidden. But the core is
coherent: one brain, one lifecycle owner, one place where stock becomes committed, and a
trail that explains every decision the system made on the company's behalf.

---

## Appendix A — File index for the critical path

| Concern | File |
|---|---|
| Risk scoring | `quotation-service/src/main/java/com/example/quotation/service/DiceEngine.java` |
| Thresholds | `quotation-service/.../service/ThresholdConfig.java` |
| Lifecycle | `quotation-service/.../service/QuotationService.java` |
| Legal transitions | `quotation-service/.../model/PipelineStage.java` |
| Line math | `quotation-service/.../service/QuotationCalculator.java` |
| ERP ingest | `quotation-service/.../service/DiceOdooIngestService.java` |
| Co-purchase | `quotation-service/.../service/CoPurchaseStats.java` |
| Governance delegation | `governance-engine/.../service/GovernanceService.java` |
| Order conversion | `deal-engine/.../service/DealService.java` |
| Reservation | `inventory-engine/.../service/InventoryService.java` |
| Conditional update | `inventory-engine/.../repository/InventoryRepository.java` |
| Propose/accept/override | `fulfillment-engine/.../service/FulfillmentService.java` |
| Gateway assembly | `gateway/src/app.ts` |
| Coarse RBAC | `gateway/src/middleware/rbac.ts` |
| Approval stamps | `approval-engine/src/services/approvalService.js` |
| Counter-offers | `negotiation-engine/src/services/negotiationService.js` |
| Event emulation | `oeeg/src/index.js`, `oeeg/src/poller.js` |
| SQL contract | `data-service/sql/schema.sql` |
| Topology | `docker-compose.yml`, `start-all.sh` |

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **D.I.C.E.** | Deal Intelligence & Control Engine — the sole decision brain, in quotation-service |
| **OEEG** | Odoo Event Emulator Gateway — emits ERP-shaped events; never decides |
| **Band** | `AUTO` \| `AUTO_WITH_AUDIT` \| `GATE` — how much oversight a decision warrants |
| **Blended discount** | Value-weighted average discount within a product category |
| **Overage** | Blended discount minus the applicable ceiling, when positive |
| **Ceiling** | Max discount for a (tier, category) pair; admin rule wins over the tier ladder |
| **Chain** | Ordered approver list — `[]`, `[Sales Manager]`, or `[Sales Manager, Finance]` |
| **Fast-track** | Gold/Platinum bypass, gated on five simultaneous conditions |
| **Stale approval** | An approval whose `quote_version_hash` no longer matches the live quote |
| **Backorder** | The unreservable remainder of a reservation request |
| **Snapshot** | An immutable `quote_version` capturing the quote at a point in time |
