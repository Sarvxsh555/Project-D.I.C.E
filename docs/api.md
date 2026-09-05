# API Reference

> Boilerplate placeholder. The authoritative source is the controllers under
> `backend/src/main/java/com/dice/controller` — this doc should summarize,
> not duplicate.

## Auth

- `POST /api/auth/login` — `{ username, password }` -> bearer token. Demo accounts: one per role (see docs/demo-flow.md), password `dice-demo`.
- `GET /api/auth/me` — current user from the bearer token.

## Deals

- `GET /api/deals` — paged list, optional `status` filter.
- `GET /api/deals/{id}` — full detail with lines.
- `POST /api/deals` — create + immediately evaluate.
- `PUT /api/deals/{id}/lines` — replace lines, re-evaluate.
- `POST /api/deals/{id}/discount` — apply a flat discount, re-evaluate.
- `POST /api/deals/{id}/evaluate` — force re-evaluation.
- `GET /api/deals/{id}/evaluations` — evaluation history.

## Approvals

- `GET /api/approvals/pending` — queue for the caller's role.
- `POST /api/approvals/{id}/approve` | `/reject` | `/escalate`.

## Negotiations

- `POST /api/negotiations/{dealId}/preview` — score a counter-offer without committing.
- `POST /api/negotiations/{dealId}/accept` — commit it.

## Fulfillment / Billing

- `GET /api/fulfillment/{dealId}/plan`, `POST /api/fulfillment/{dealId}/commit`, `/ship`.
- `GET /api/billing/{dealId}/schedule`, `POST /api/billing/{dealId}/draft`, `/invoiced`, `/paid`.

## Webhooks

- `POST /api/webhooks/odoo` — envelope `{ type, payload }`, signed with `X-Odoo-Signature`. See [event-contracts.md](./event-contracts.md).

## TODO

- Generate this from OpenAPI once springdoc is added, rather than hand-maintaining it.
