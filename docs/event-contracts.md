# Event Contracts

This is the frozen wire contract between OEEG (or a real Odoo instance,
eventually) and DICE's integration boundary. It has two parts:

- **v1 — live today.** What `OdooWebhookController` actually accepts and
  `OdooEventAdapter` actually routes, and what `oeeg`'s `EventPublisher`
  actually sends. This is real, verified end-to-end (see "Verified" below).
- **v2 — proposed, not implemented.** The normalized envelope the wider
  architecture calls for (`eventId`, `source`, `externalEventId`, `timestamp`).
  Do not build against this yet — see "v2 envelope" below for why.

Keep this in sync with `oeeg/src/main/java/com/dice/oeeg/events/EventType.java`
(the OEEG-emittable whitelist) and the backend's
`com.dice.events.DealEvent.Type` / `com.dice.integration.odoo.OdooEventAdapter`.

## v1 envelope (live)

```json
{
  "type": "DISCOUNT_CHANGED",
  "payload": { "...": "event-specific fields" }
}
```

`POST /api/webhooks/odoo`, header `X-Odoo-Signature: <shared secret>`
(`DICE_ODOO_WEBHOOK_SECRET`; an empty configured secret disables the check,
which is why local dev works without setting it).

No `eventId`, no idempotency, no dedup, no explicit source tag. Two identical
webhook calls are indistinguishable and both fully re-evaluate the deal — this
is safe today only because every handler is idempotent by construction (see
"Idempotency" below), not because the transport guarantees anything.

### OEEG-emittable event whitelist

This is deliberately a **strict subset** of the event types you'll see
mentioned elsewhere in planning docs. Every one of these has a real handler in
`OdooEventAdapter.handle`; anything not on this list falls through to
`IGNORED` with no side effect. `EventType.fromWireName` in OEEG enforces this
at generation time — a typo or an out-of-scope type fails before any HTTP call.

| Type | Required payload fields | Identity field | Notes |
|---|---|---|---|
| `QUOTE_CREATED` | `quotationId`, `partnerId` | — | Re-evaluates an **existing** deal already linked to that Odoo quotation. Does **not** create a new deal — see "Open question: quote origination" below. |
| `DISCOUNT_CHANGED` | `discountPercent` | `dealId` or `quotationId` | Applies a flat discount across every line, re-evaluates. |
| `QUANTITY_CHANGED` | — | `dealId` or `quotationId` | Triggers a full re-evaluation; the adapter doesn't currently read line-level quantity fields from the payload — see backend `OdooEventAdapter.handleQuantityChanged`. |
| `COUNTER_OFFER` | `requestedDiscountPercent` | `dealId` or `quotationId` | From the customer portal or Odoo. |
| `INVENTORY_CHANGED` | `odooProductId`, `quantityOnHand` | — | Only a stock **reduction** on a deal in flight matters; increases are recorded silently. |

**Not on this list, and not to be emitted by OEEG:** `APPROVAL_GRANTED`,
`APPROVAL_REQUESTED`, `APPROVAL_REJECTED`, `DEAL_CREATED`, `DEAL_EVALUATED`,
`DEAL_CONFIRMED`, `FULFILLMENT_PLANNED`, `INVOICE_DRAFTED`. These are all
**internal** DICE-originated facts (raised by `DealService`/`ApprovalService`
onto the internal `com.dice.events.DealEvent` bus for the audit trail) — they
are not things an external system like Odoo would push in, and OEEG simulating
them would blur exactly the boundary this architecture exists to keep sharp.
Concretely: granting an approval happens by a manager calling
`POST /api/approvals/{id}/approve` through the real, JWT-authenticated
Approvals UI — never through the webhook. Scenario JSON files document this as
a `manualSteps` entry rather than a fake inbound event.

### Identity resolution

Handlers that need to find a deal accept **either** `dealId` (a DICE UUID) or
`quotationId` (an Odoo `sale.order` id), tried in that order — see
`OdooEventAdapter.withDeal`. Which one a real Odoo integration would send is
unresolved; OEEG's scenarios currently use `quotationId` for anything modeling
an Odoo-side edit, and `dealId` when acting directly against a deal that
originated in DealFlow360 (no Odoo link yet).

### Idempotency

There is no dedup layer. Replaying the exact same `DISCOUNT_CHANGED` event
twice re-applies the same discount and re-evaluates twice, landing on the same
state both times (verified empirically — see below). This holds because every
handler is naturally idempotent (they *set* a value and re-evaluate, they
don't *increment* anything) — it is not an explicit guarantee, and would break
the moment a handler does something additive. Worth keeping in mind before v2
adds a `externalEventId` specifically to make dedup real rather than
accidental.

## v2 envelope (proposed — not implemented)

```json
{
  "eventId": "...",
  "eventType": "DISCOUNT_CHANGED",
  "source": "OEEG",
  "externalEventId": "...",
  "dealId": "...",
  "timestamp": "...",
  "payload": {}
}
```

This requires a coordinated backend change — a new `IntegrationEventEnvelope`
DTO, a real `externalEventId`-keyed dedup table (`integration_events`, per the
domain sketch), and `OdooWebhookController` accepting it — before OEEG can
send it. **Do not send these extra fields against the live v1 endpoint**: the
controller's `EventEnvelope` record has no `@JsonIgnoreProperties`, so extra
top-level fields will fail deserialization rather than being silently dropped.

Tracked as an open coordination item, not yet scheduled.

## Open question: quote origination

The example flow in the architecture brief starts with OEEG's `QUOTE_CREATED`
*originating* a deal. The implementation today does the opposite: a deal is
always created first in DealFlow360 (`POST /api/deals`, by a sales rep), and
`QUOTE_CREATED` only re-evaluates a deal **already** linked to that Odoo
quotation via `odoo_quotation_id` — there is no API to establish that link
after the fact either. `QUOTE_CREATED` itself is still unresolved and not on
the OEEG-emittable whitelist as a result.

**Worked around, not resolved (2026-09-05):** the four demo scenarios no
longer need `QUOTE_CREATED` to do anything. `ScenarioRunner` supports an
optional `setup` block — `DiceApiClient` logs in, looks up a customer/product
via the new `GET /api/customers`/`GET /api/products`, and creates the deal
directly through the real `POST /api/deals`, exactly as a sales rep would.
The resulting deal id is substituted into the scenario's steps. This is
explicitly *not* an emitted event — see `DiceApiClient`'s class doc — it's
scenario setup, honest about being outside the webhook boundary. Verified
live: both `complete-deal-flow` and `discount-escalation` now run start to
finish with zero manual database access.

Still genuinely open, for whoever ends up building real Odoo sync: does
DealFlow360 stay the origin with Odoo as a downstream mirror (matches today's
code), or does Odoo become the origin and the adapter needs to *create* deals
on `QUOTE_CREATED`? The OEEG workaround above sidesteps this rather than
answering it — flagging for architecture sign-off rather than picking one
silently.

## Verified

On 2026-09-05, a real deal was created via the live API
(`POST /api/deals`, `DICE-000001`, Acme Enterprises / Standard Widget x10,
$1000 subtotal, 40% margin) and OEEG's `ScenarioRunner` was pointed at it with
a two-step scenario (`DISCOUNT_CHANGED` to 25%, then `COUNTER_OFFER` to 8%),
run as an actual HTTP client against a running backend + MySQL — no mocks
anywhere in the chain:

- `DISCOUNT_CHANGED 25%` → the seeded `GLOBAL_DISCOUNT_CAP` policy (20%
  threshold) fired for real → `REQUIRE_APPROVAL`, deal status
  `PENDING_APPROVAL`, margin recalculated to 20.0%, health score to 82.
- `COUNTER_OFFER 8%` → clean re-evaluation → `AUTO_APPROVE`, deal status back
  to `APPROVED`, margin 34.78%, `totalAmount` correctly recalculated to $920.

Confirmed via `GET /api/deals/{id}` and `GET /api/deals/{id}/evaluations`
after the run.
