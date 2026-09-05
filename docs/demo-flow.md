# Demo Flow

## Accounts

The backend seeds one in-memory user per role (see `SecurityConfig.userDetailsService`). Username is the lowercased role name, password is `dice-demo` for all of them:

| Username | Role |
|---|---|
| `sales_rep` | SALES_REP |
| `sales_manager` | SALES_MANAGER |
| `finance` | FINANCE |
| `operations` | OPERATIONS |
| `admin` | ADMIN |
| `customer` | CUSTOMER |

## Running a scenario (verified working, 2026-09-05)

```bash
# 1. Bring up Postgres + backend (dev profile seeds customers/products/policies)
docker compose up -d postgres backend

# 2. Run a scenario — it creates its own deal via the real API, no manual setup needed
cd oeeg
OEEG_TARGET_URL=http://localhost:8080/api/webhooks/odoo \
OEEG_DICE_API_URL=http://localhost:8080/api \
./mvnw spring-boot:run -Dspring-boot.run.arguments=complete-deal-flow
```

Available scenarios (`oeeg/scenarios/*.json`):

- `complete-deal-flow` — modest discount, clears every policy on its own (`AUTO_APPROVE`).
- `discount-escalation` — discount breaches `GLOBAL_DISCOUNT_CAP` → `REQUIRE_APPROVAL`.
- `customer-counteroffer` — a counter-offer re-evaluates the deal.
- `inventory-change` — a stock drop on a product with an open deal.

Each scenario logs which deal it created (`DICE-00000N`) — look it up via
`GET /api/deals/{id}` (or, once built, the frontend) to see the result.

## Full walkthrough: discount escalation → approval → material change → reapproval

This is the brief's core example, and the one actually verified end-to-end
against real Postgres (see docs/decision-contract.md, "Approval snapshot /
reapproval"). Steps 1–2 are automated by OEEG; 3 onward are manual because
granting an approval is a DICE-internal decision — not something OEEG, an
*external*-event simulator, should ever simulate (see docs/event-contracts.md's
event whitelist for why).

1. Run the `discount-escalation` scenario — creates a deal, pushes the
   discount to 25%, which breaches `GLOBAL_DISCOUNT_CAP` (20%). Deal moves to
   `PENDING_APPROVAL`. Note the returned deal id.
2. Log in as `sales_manager` (`POST /api/auth/login`), find the pending
   approval for that deal, and `POST /api/approvals/{id}/approve`. This
   captures an `ApprovalSnapshot` of the deal's state at $750/25%/20% margin.
   (`GET /api/approvals/pending` and `GET /api/approvals/deal/{id}` currently
   500 due to [issue #1](https://github.com/Sarvxsh555/Project-D.I.C.E/issues/1)
   — until fixed, find the approval id via the database or the deal's
   evaluation history.)
3. `POST /api/deals/{id}/discount` with a materially different value (e.g.
   5% — which alone would cleanly `AUTO_APPROVE`). Watch the response:
   `status: PENDING_APPROVAL` even though nothing currently breaches policy —
   this is `REAPPROVAL_REQUIRED`, because the approved snapshot no longer
   matches the live deal.
4. `GET /api/deals/{id}/evaluations` — the latest entry's `outcome` is
   `REAPPROVAL_REQUIRED`, and `GET .../decisions` (via the DB, no controller
   surface yet) shows a rationale naming exactly what changed since the prior
   approval.

## Not yet buildable into this walkthrough

- Fulfillment/billing steps, once a deal reaches `APPROVED` — the engines and
  services are real (`FulfillmentEngine`, `BillingEngine`) but haven't been
  exercised as part of a scripted demo yet.
- Anything customer-portal-facing — no portal-scoped endpoint exists yet, only
  the general `NegotiationController` (see docs/architecture.md's
  authorization note: the portal's field restrictions must be backend-enforced,
  not just hidden in the frontend, and that enforcement doesn't exist yet).
