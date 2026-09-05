# DealFlow360 API catalog (for the API gateway)

Single browser origin should proxy here. Services today listen on raw ports; the gateway
replaces those origins. Auth: Bearer JWT from login-service, except where noted.

**D.I.C.E.** = Deal Intelligence & Control Engine (decisions).  
**OEEG** = Odoo Event Emulator Gateway (not intelligence). It posts realistic Odoo-shaped
events so D.I.C.E. can react without a live Odoo. Live JSON-RPC runs only if
`DICE_ODOO_ENABLED=true`.

| Gateway `:8000` | Public origin. Browser talks only here. |

---

## Gateway routing table

| Gateway path | Upstream | Auth | Roles |
|---|---|---|---|
| `/api/auth/**` | `login-service :8080` | Public (refresh uses cookie) | — |
| `/api/portal/me` | `:8080` | Bearer | any |
| `/api/admin/analytics/**` | `:8080` | Bearer | ADMIN, SALES_MANAGER |
| `/api/admin/discount-rules/**` | `:8080` | GET any authed; write ADMIN, SALES_MANAGER | |
| `/api/admin/**` | `:8080` | Bearer | ADMIN |
| `/api/quotations/**` | `quotation-service :8082` | Bearer | see quote rows |
| `/api/products` | `:8082` | Bearer | any authed |
| `/api/customers` | `:8082` | Bearer | any authed |
| `/api/dice/**` | `:8082` | Bearer | scoped like quotes |
| `/api/webhooks/odoo` | `:8082` | `X-OEEG-Key` | OEEG only |
| `/api/quotes/*/evaluate` | `governance-engine :8084` | Bearer | any authed |
| `/api/approvals/**` | `approval-engine :8085` | Bearer | list any; act ADMIN, SALES_MANAGER, FINANCE |
| `/api/negotiations/**` | `negotiation-engine :8086` | Bearer | customer + internal |
| `/api/deals/**` | `deal-engine :8083` | Bearer | internal |
| `/api/orders/**` | `:8083` | Bearer | internal |
| `/api/fulfillment/**` | `fulfillment-engine :8088` | Bearer | FINANCE, ADMIN (mutations) |
| `/api/inventory/**` | `inventory-engine :8087` | Bearer | (intended; HTTP surface incomplete) |
| `/api/recommendations/rank` | `recommendation-engine :8089` | Bearer | any authed |
| `/api/deal-health/**` | `deal-health-engine :8090` | Bearer | any authed |
| `/api/billing/**` | `billing-engine :8091` | Bearer | view any; mutations FINANCE, ADMIN |
| `/api/oeeg/**` | `oeeg :8092` | Bearer; ADMIN unless `GATEWAY_DEMO_OEEG=true` | emulator console |
| `/send-reset-email` | `mailer-service :4000` | none (internal) | **do not expose** on public gateway |

Cookie: `refresh` httpOnly on login-service. Gateway must forward `Cookie` and
`X-XSRF-TOKEN` for `/api/auth/refresh` and `/api/auth/logout`. CORS becomes the
gateway origin only.

---

## 1. Identity — login-service `:8080`

| Method | Path | Body / query | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ username, email, password }` | Sets refresh cookie; default role SALES_REP |
| POST | `/api/auth/login` | `{ username, password }` | `{ success, message, accessToken }` |
| POST | `/api/auth/refresh` | cookie | CSRF header required |
| POST | `/api/auth/logout` | Bearer + cookie | |
| POST | `/api/auth/forgot-password` | `{ email }` | mailer internal |
| POST | `/api/auth/reset-password` | `{ token, password }` | |
| GET | `/api/portal/me` | | Profile |

Admin CRUD (ADMIN unless noted):  
`GET/POST /api/admin/{products\|price-lists\|discount-rules\|warehouses\|subscription-plans\|recommendation-rules}`  
`GET/PUT/DELETE /api/admin/{resource}/{id}`  
`GET /api/admin/analytics/summary` — ADMIN, SALES_MANAGER  
`GET /api/admin/discount-rules` — any Bearer (governance hop)

---

## 2. Quote spine + D.I.C.E. — quotation-service `:8082`

CUSTOMER tokens are forced to their `customerId` claim on list/get.

| Method | Path | Body | Who |
|---|---|---|---|
| GET | `/api/quotations` | query: status, customerId, rep, from, to, minAmount, maxAmount, q, sortBy, direction, page, size | CUSTOMER scoped |
| GET | `/api/quotations/{id}` | | |
| POST | `/api/quotations` | `{ customerId, lines: [{ productId, quantity, discountPercent }] }` | SALES_REP |
| PUT | `/api/quotations/{id}` | same | DRAFT only |
| POST | `/api/quotations/{id}/transition` | `{ toStage }` | D.I.C.E. runs on `PENDING_APPROVAL` (auto-approve or chain) |
| GET | `/api/quotations/{id}/approval-chain` | | |
| GET | `/api/quotations/{id}/audit` | | includes `DICE` rows |
| POST | `/api/quotations/{id}/counter-discount` | `{ lineId, proposedDiscountPercent, reason }` | negotiation / customer |
| POST | `/api/quotations/{id}/approve` | `{ reason }` | ADMIN, SALES_MANAGER, FINANCE vs current step |
| POST | `/api/quotations/{id}/reject` | `{ reason }` | same |
| POST | `/api/quotations/{id}/return` | `{ reason }` | same |
| POST | `/api/quotations/{id}/customer-confirm` | empty | CUSTOMER accept-as-is |
| GET | `/api/products?q=&category=` | | |
| GET | `/api/customers` | | |
| GET | `/api/recommendations?productIds=` | | pairing candidates |
| GET | `/api/dice/quotes/{id}/decision` | | **D.I.C.E. dry-run** |
| POST | `/api/webhooks/odoo` | see OEEG | `X-OEEG-Key` |

Stages: `DRAFT → PENDING_APPROVAL → NEGOTIATION → APPROVED → ORDERED → FULFILLMENT → COMPLETED`

---

## 3. Other engines

**Governance `:8084`** (policy fetch; D.I.C.E. is canonical for quote routing)

| Method | Path |
|---|---|
| POST | `/api/quotes/{id}/evaluate` |
| GET | `/api/quotes/{id}/evaluations` |

**Approval `:8085`**

| Method | Path |
|---|---|
| GET | `/api/approvals?quotationId=&status=` |
| GET | `/api/approvals/{id}` |
| GET | `/api/approvals/{id}/decisions` |
| POST | `/api/approvals` `{ quotationId }` |
| POST | `/api/approvals/by-quotation/{quotationId}/invalidate` `{ reason }` |
| POST | `/api/approvals/{id}/approve` `{ reason }` |
| POST | `/api/approvals/{id}/reject` `{ reason }` |
| POST | `/api/approvals/{id}/return` `{ reason }` |

**Negotiation `:8086`**

| Method | Path |
|---|---|
| GET | `/api/negotiations/{quotationId}/events` |
| GET | `/api/negotiations/{quotationId}/versions` |
| POST | `/api/negotiations/{quotationId}/comments` `{ lineId, message }` |
| POST | `/api/negotiations/{quotationId}/change-requests` `{ message }` |
| POST | `/api/negotiations/{quotationId}/counter-discount` `{ lineId, proposedDiscountPercent, message }` |

**Deal `:8083`**

| Method | Path |
|---|---|
| GET | `/api/deals` |
| POST | `/api/deals` `{ quotationId }` |
| GET | `/api/deals/{id}` |
| POST | `/api/deals/{id}/snapshot` `{ reason }` |
| GET | `/api/deals/{id}/versions` |
| POST | `/api/deals/{id}/lost` `{ reason }` |
| POST | `/api/deals/{id}/convert-to-order` |
| GET | `/api/deals/{id}/orders` |
| GET | `/api/orders/{id}` |

**Fulfillment `:8088`**

| Method | Path |
|---|---|
| POST | `/api/fulfillment/orders/{orderId}/propose` |
| GET | `/api/fulfillment/orders/{orderId}` |
| GET | `/api/fulfillment/plans/{id}` |
| POST | `/api/fulfillment/plans/{id}/accept` |
| POST | `/api/fulfillment/plans/{id}/override` `{ lines: [{ productId, warehouseId, quantity }] }` |

**Recommendation `:8089`** `GET /api/recommendations/rank?productIds=&minMargin=`

**Deal health `:8090`**  
`GET /api/deal-health/dashboard`  
`GET /api/deal-health/{quotationId}`

**Billing `:8091`**

| Method | Path | Finance-only |
|---|---|---|
| GET | `/api/billing/orders/{orderId}` | no |
| POST | `/api/billing/orders/{orderId}/initialize` `{ lines }` | no |
| POST | `/api/billing/orders/{orderId}/run-recurring` | yes |
| POST | `/api/billing/orders/{orderId}/credit-notes` `{ amount, reason, subscriptionId? }` | yes |
| POST | `/api/billing/subscriptions/{id}/change-quantity` `{ newQuantity }` | yes |
| POST | `/api/billing/subscriptions/{id}/cancel` `{ reason }` | yes |

**Mailer `:4000`** `POST /send-reset-email` `{ to, resetLink }` — cluster-internal only.

---

## 4. OEEG `:8092` — emulator, not D.I.C.E.

Hackathon line: *OEEG emulates Odoo events so we can demonstrate the D.I.C.E. decision
engine without depending on a live Odoo instance.*

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/oeeg/health` | liveOdooRpc flag, webhook target |
| GET | `/api/oeeg/scenarios` | four scenarios |
| POST | `/api/oeeg/scenarios/{event}` | fire emulator → `POST :8082/api/webhooks/odoo` |
| POST | `/api/oeeg/odoo/execute-kw` | `{ model, method, args, kwargs }` — **no-op unless `DICE_ODOO_ENABLED=true`** |

Events: `stock.replenished` | `account.payment_posted` | `stock.picking_done` | `sale.order_confirmed`

Fire body (optional): `{ quotationId, orderId, productId, warehouseId, quantity, amount, alsoCallLiveOdoo }`

Webhook envelope OEEG → D.I.C.E.:

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

Header: `X-OEEG-Key: oeeg-demo-key`

---

## 5. Call flows the gateway should preserve

```
Browser → GATEWAY → login :8080          (JWT)
Browser → GATEWAY → quotation :8082      (D.I.C.E. on submit / confirm)
OEEG    → GATEWAY or direct webhook      POST /api/webhooks/odoo → D.I.C.E. ingest
approval-engine → quotation + governance
negotiation     → quotation + approval
fulfillment     → deal + inventory + quotation
deal-health     → quotation + approval + negotiation + inventory
governance      → quotation + login discount-rules
login           → mailer :4000           (not via public gateway)
```

Do **not** route D.I.C.E. through OEEG. OEEG only **emits**; D.I.C.E. only **decides**.
