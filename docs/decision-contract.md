# Decision Contract

The semantic contract for what DICE outputs when it evaluates a deal. Same
structure as [event-contracts.md](./event-contracts.md): what's actually live
today, mapped against the target semantic model, with gaps named rather than
papered over.

Keep this in sync with `backend/src/main/java/com/dice/domain/enums/DecisionOutcome.java`,
`backend/src/main/java/com/dice/domain/{Evaluation,Decision}.java`, and
`backend/src/main/java/com/dice/engine/decision/DecisionResolver.java`.

## Target semantic model

> "Given the deal's current state, what should happen next?"

```
{
  dealId,
  evaluationId,
  decision,
  riskScore,
  margin,
  nextAction,
  reasons
}
```

## Live today, mapped field by field

| Target field | Live equivalent | Status |
|---|---|---|
| `dealId` | `Evaluation.deal` / `Decision.deal` | ✅ present |
| `evaluationId` | `Evaluation.id`, `Decision.evaluation` (one-to-one) | ✅ present |
| `decision` | `Evaluation.outcome` / `Decision.outcome` (`DecisionOutcome`) | ⚠️ present, vocabulary differs — see below |
| `margin` | `Evaluation.marginPercent` | ✅ present, real (from `MarginEngine`, not faked) |
| `riskScore` | — | ❌ **not persisted** — see "Critical gap" below |
| `nextAction` | `Decision.rationale` (free text, not structured) | ⚠️ present but not machine-readable |
| `reasons` | `Decision.rationale` (free text) + `Evaluation.policyResults` (JSON text blob of `PolicyEngine.Violation[]`) | ⚠️ present but split across two unstructured fields |

Everything under `margin` and the policy-violation list is **real, computed
data** — verified live in the event-contracts.md smoke test (25% discount
produced an actual `GLOBAL_DISCOUNT_CAP` violation from a seeded policy row,
not a canned response). The gaps below are about what's *persisted and
exposed*, not about anything being faked.

## Risk score gap — partially closed (2026-09-05)

`RiskEngine.assess()` returns a real `RiskAssessment(int score, RiskLevel level,
List<Factor> factors)` — each `Factor` already carries `(code, points,
explanation)`, i.e. the "+18 Discount exceeds tier threshold" style breakdown
the brief's RISK section calls for. This is computed on **every** evaluation
inside `DecisionResolver.resolve()`.

**Closed:** the 0–100 `score` now persists. `V8__approval_snapshots.sql` added
`risk_score` to both `deals` and `evaluations`; `DealService.evaluate()`
populates it from `resolution.risk().score()` on both; `DealController`'s
`DealSummary`/`DealDetail`/`EvaluationSummary` all return it. Verified live —
a deal at 25% discount showed `riskScore: 12`, dropping to `2` once the
discount was reduced back to 5%. Approval snapshots also capture it, so it's
part of the audit trail, not just the live number.

**Still open:** the `List<Factor>` (the "why" behind the number — "+18
discount exceeds tier threshold") is still computed and discarded, never
persisted or returned. No `evaluation_factors` table exists. Practical effect:
the number can now be shown ("RISK: 12 — LOW"), but not yet the explanation
underneath it. Same fix shape as before, smaller scope now that the score
itself is handled:
1. Persist `RiskAssessment.factors()` — a JSON text column on `Evaluation`,
   matching the existing `policyResults` precedent (leaning this way over a
   normalized table unless factor-level querying turns out to matter — a call
   for whoever picks this up).
2. Return it from `DealController.EvaluationSummary`.

## Vocabulary gap: `DecisionOutcome` vs. the brief's decision types

| Brief's term | Live `DecisionOutcome` | Notes |
|---|---|---|
| `AUTO_APPROVED` | `AUTO_APPROVE` | Same concept, different tense/casing. Cosmetic. |
| `APPROVAL_REQUIRED` | `REQUIRE_APPROVAL` | Same concept, different word order. Cosmetic. |
| — | `BLOCK` | Not in the brief's list. A hard floor breach with no viable alternative. Real and in use. |
| — | `RECOMMEND_ALTERNATIVE` | Not in the brief's list. Blocked, but `RecommendationEngine` found a way out. Real and in use. |
| `REAPPROVAL_REQUIRED` | `REAPPROVAL_REQUIRED` | ✅ **Built and verified live (2026-09-05)** — see below. |
| `DEAL_AT_RISK` | — (exists as `DealHealthEngine.Band.AT_RISK`/`CRITICAL`, a *different* axis) | Health is a continuous score with bands; `DecisionOutcome` is the discrete "what happens next" the pipeline resolves to. I'd recommend **not** collapsing these into one enum — a deal can be `AUTO_APPROVE`d and still be `AT_RISK` on health (e.g. margin trending down but still above every threshold). Flagging as a recommendation, not deciding unilaterally since it shapes the UI contract Siddharth/CM build against. |
| `FULFILLMENT_SPLIT` | — | Doesn't exist as a decision outcome. `FulfillmentEngine` already computes per-line `PARTIALLY_ALLOCATED`/`BACKORDERED` status — that's arguably the right home for this concept (a fulfillment-plan property) rather than a fifth `DecisionOutcome`, for the same reason as `DEAL_AT_RISK` above: it's a different axis, not an alternative to "should this deal be approved." |

**Recommendation, pending your sign-off:** rename `AUTO_APPROVE`→`AUTO_APPROVED`
and `REQUIRE_APPROVAL`→`APPROVAL_REQUIRED` for brief alignment (cosmetic, low
risk, touches every switch statement over the enum — coordinate timing with
Sarveshvaran so it's one clean commit, not a merge conflict magnet). Keep
`BLOCK`/`RECOMMEND_ALTERNATIVE` — they're real states with no equivalent in
the brief's list, not a gap to close. Treat `DEAL_AT_RISK` and
`FULFILLMENT_SPLIT` as *health/fulfillment* concepts to surface in the UI
alongside the decision, not as `DecisionOutcome` values to add.

## Approval snapshot / reapproval — built (2026-09-05)

`ApprovalSnapshot` (`approval_snapshots`, migration V8) freezes the
approval-sensitive state — subtotal/discount/total, margin, risk score+level,
customer payment terms, and a JSON line-level snapshot (product, quantity,
unit price, discount) — at the moment `ApprovalService` clears the last
pending approval on a deal. A partial unique index enforces at most one active
(non-superseded) snapshot per deal at the database level, not just in code.

`MaterialChangeDetector` (`engine/approval`) is the pure comparison: any
change to the line set, a >$0.01 move in total amount, a >0.01pt move in
margin, a risk-level *bucket* change (raw score drift alone doesn't count —
too noisy), or a payment-terms change, is material. There is deliberately no
"how much is too much" business threshold beyond float-rounding tolerance —
an approval is scoped to an exact state, and any real change to it needs a
human to look again.

`DealService.evaluate()` runs this check against the active snapshot on every
re-evaluation. If material:
- the snapshot is superseded (kept, not deleted — it's the audit record of
  what was actually approved), with a human-readable diff of what changed;
- if the fresh policy check alone would have silently cleared the deal
  (`AUTO_APPROVE`/`RECOMMEND_ALTERNATIVE`), the outcome is upgraded to
  `REAPPROVAL_REQUIRED` and a fresh approval opens, addressed back to whoever
  approved it last time (`ApprovalSnapshot.approvedByRole`);
- if the fresh check already forces a human decision (`REQUIRE_APPROVAL`/
  `BLOCK`), that's left as-is — a new approval cycle is already happening, so
  the invalidated-snapshot fact is appended to the rationale instead of
  layering a second approval requirement on top.

**Verified live** against real MySQL, through the real API, no mocks: a
deal discounted to 25% (`REQUIRE_APPROVAL`, `GLOBAL_DISCOUNT_CAP`) was approved
by `sales_manager`, capturing a snapshot ($750 total, 20% margin, risk 12).
Dropping the discount to 5% — which alone would cleanly `AUTO_APPROVE` — was
correctly overridden to `REAPPROVAL_REQUIRED`, with the old snapshot
superseded (`totalAmount: 750.00 -> 950.00; marginPercent: 20.0000% ->
36.8421%; line changed: ...`) and a fresh approval opened for `SALES_MANAGER`
with `policyCode: MATERIAL_CHANGE`. This is the brief's own headline example
("customer counteroffers → material change detected → REAPPROVAL_REQUIRED"),
working end to end.

**Not covered by this pass, flagged for follow-up:**
- Only the "silently clears" branch was live-verified. The "already forces
  approval, gets annotated" branch (fresh state still breaches a policy) is
  implemented and reasoned through in code comments, but not yet exercised
  live.
- `customerPaymentTermsDays` on the snapshot is a proxy — deals don't carry
  their own payment-terms override, only the customer does (see "Open
  question" below, unchanged).
- Found and filed, not fixed here (not this workstream's package):
  [`LazyInitializationException` on `/api/approvals/pending` and
  `/api/approvals/deal/{id}`](https://github.com/Sarvxsh555/Project-D.I.C.E/issues/1)
  — a pre-existing bug, unrelated to this change, that blocked testing until
  worked around by querying MySQL directly for the approval id.

## `nextAction` / `reasons` — currently free text

`Decision.rationale` is a hand-built multi-line string (see
`DecisionResolver.explain()`) — good for a human reading it in a UI panel
today, but not machine-parseable for e.g. a "what would make it auto-approved"
button that needs to act on a specific reason. The brief's "WHAT WOULD MAKE IT
AUTO-APPROVED?" feature already has real backing data for this
(`RecommendationEngine.Recommendation` has `code`/`title`/`rationale`/
`estimatedValue`/`confidence` — structured, not free text) but that's a
separate field (`Decision.recommendations`, also currently a serialized JSON
*string* rather than a queryable shape) from `rationale`. No change proposed
here — noting it as context for whoever builds that UI panel: use
`recommendations`, not `rationale`, as the structured source.
