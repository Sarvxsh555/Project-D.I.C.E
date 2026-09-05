# Odoo Integration

> Boilerplate placeholder.

## Modes

- **Emulated (default)** — `DICE_ODOO_ENABLED=false`. `OdooClient` no-ops on every call; the system runs entirely on locally seeded data plus events posted by OEEG to `/api/webhooks/odoo`.
- **Live** — `DICE_ODOO_ENABLED=true`, with `ODOO_URL`/`ODOO_DB`/`ODOO_USERNAME`/`ODOO_API_KEY` set. `OdooClient` calls Odoo's JSON-RPC `/jsonrpc` endpoint.

## Outbound

`OdooClient.postDecision` writes `x_dice_outcome` / `x_dice_rationale` back onto the `sale.order` record. TODO: confirm these are the actual custom field names once they exist on the Odoo side, and add the fields via an Odoo module/studio customization.

## Inbound

Real Odoo webhooks and OEEG-emulated ones share the exact same endpoint and payload shape (`OdooEventAdapter`) — see [event-contracts.md](./event-contracts.md). TODO: document how the real Odoo side triggers these webhooks (server action, automated action, or a custom module).

## TODO

- Field mapping table (Odoo model.field -> DICE domain field) once the target Odoo version/modules are confirmed.
- Auth: API key vs OAuth for the JSON-RPC calls.
