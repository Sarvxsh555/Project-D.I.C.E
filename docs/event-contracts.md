# Event Contracts

> Boilerplate placeholder — this is the wire contract between OEEG/Odoo and
> the backend webhook. Keep it in sync with `com.dice.events.DealEvent.Type`
> and `oeeg/src/main/java/com/dice/oeeg/events`.

## Envelope

```json
{
  "type": "DISCOUNT_CHANGED",
  "payload": { "...": "event-specific fields" }
}
```

Sent as `POST /api/webhooks/odoo` with header `X-Odoo-Signature: <shared secret>`.

## Event types (TODO: confirm payload shapes as each is implemented)

| Type | Payload fields | Notes |
|---|---|---|
| `QUOTE_CREATED` | `quotationId`, `partnerId` | Requires a DICE deal already linked to the quotation. |
| `DISCOUNT_CHANGED` | `dealId` or `quotationId`, `discountPercent` | Applies flat discount, re-evaluates. |
| `QUANTITY_CHANGED` | `dealId` or `quotationId` | Triggers full re-evaluation. |
| `COUNTER_OFFER` | `dealId` or `quotationId`, `requestedDiscountPercent` | From the customer portal or Odoo. |
| `INVENTORY_CHANGED` | `odooProductId`, `quantityOnHand` | Only stock reductions on in-flight deals matter. |
| `APPROVAL_GRANTED` | `dealId`, `approvedBy` | TODO: adapter routing not yet implemented for this type. |

## TODO

- Decide whether `dealId` (DICE UUID) or `quotationId` (Odoo id) is canonical in the emulator payloads — currently both are accepted, see `OdooEventAdapter.withDeal`.
