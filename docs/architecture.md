# Architecture

> Boilerplate placeholder — expand as the system takes shape.

## Components

- **frontend/** — React + TypeScript SPA. Talks to the backend over the `/api` REST surface.
- **backend/** — Spring Boot service. Owns the deal lifecycle, the decision engines, and persistence.
- **database/** — Flyway migrations (schema) and seed data, consumed by the backend at build/run time.
- **oeeg/** — Odoo Event Emulation Gateway. Replays scripted scenarios against the backend's webhook endpoint so the whole stack can run demo-quality without a real Odoo instance.

## Backend engine pipeline

`DecisionResolver` (backend/src/main/java/com/dice/engine/decision) orchestrates, in order:

1. `MarginEngine` — profitability per line and per deal.
2. `RiskEngine` — customer/deal risk score.
3. `PolicyEngine` — evaluates configured `Policy` rows against the deal.
4. `ApprovalEngine` — turns policy violations into required sign-offs.
5. `RecommendationEngine` — suggests ways to rescue a blocked/escalated deal.
6. `DealHealthEngine` — rolls everything into a single 0–100 score.

Each engine is pure/stateless; `DealService` is what persists the results (`Evaluation`, `Decision`, `Approval`) and publishes `DealEvent`s.

## Odoo integration

`OdooEventAdapter` (backend/src/main/java/com/dice/integration/odoo) is the single seam between the outside world and the domain. Both a real Odoo webhook and an OEEG-emulated one land on `POST /api/webhooks/odoo` and are routed through the same adapter — see [odoo-integration.md](./odoo-integration.md).

## TODO

- Diagram the request flow (SPA -> backend -> engines -> Odoo).
- Document the auth model once real identity replaces the in-memory demo users.
