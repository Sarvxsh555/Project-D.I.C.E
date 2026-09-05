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

## Critical gap: risk score and factors are computed, then thrown away

`RiskEngine.assess()` returns a real `RiskAssessment(int score, RiskLevel level,
List<Factor> factors)` — each `Factor` already carries `(code, points,
explanation)`, i.e. the "+18 Discount exceeds tier threshold" style breakdown
the brief's RISK section calls for. This is computed on **every** evaluation
inside `DecisionResolver.resolve()`.

None of it survives past that call:

- `Deal.riskLevel` and `Evaluation.riskLevel` store only the bucket
  (`LOW`/`MODERATE`/`HIGH`/`CRITICAL`), never the 0–100 `score`.
- The `List<Factor>` (the "why") is never persisted anywhere — no
  `evaluation_factors` table exists yet, matching the domain sketch's plan but
  not yet built.
- No controller returns it either — `DealController.EvaluationSummary` exposes
  `riskLevel` (the enum) and a raw `policyResults` JSON string, but nothing
  from `RiskAssessment`.

Practical effect: DICE genuinely computes "RISK: 74 — HIGH, top driver:
service discount" internally, but there is currently no way for a Deal
Workspace UI to *ever* render that number or that explanation — not from
history, and not even from a fresh evaluation's API response. This is the
single highest-leverage gap standing between what DICE already computes and
what the brief's "RISK SCORE" / "WHY?" panel needs to show.

**Fix requires (not done here — backend/domain work, needs Sarveshvaran):**
1. Add `risk_score INTEGER` to `deals` and `evaluations`.
2. Persist `RiskAssessment.factors()` — either a proper `evaluation_factors`
   table (matches the domain sketch, queryable) or a JSON text column on
   `Evaluation` (matches the existing `policyResults` pattern, faster to ship).
   Given `policyResults` already sets the JSON-blob-on-Evaluation precedent,
   I'd lean toward consistency (JSON column) unless factor-level querying
   turns out to matter — flagging as a call for whoever picks this up, not
   deciding it here.
3. Return both from `DealController` — `EvaluationSummary` is the natural spot.

## Vocabulary gap: `DecisionOutcome` vs. the brief's decision types

| Brief's term | Live `DecisionOutcome` | Notes |
|---|---|---|
| `AUTO_APPROVED` | `AUTO_APPROVE` | Same concept, different tense/casing. Cosmetic. |
| `APPROVAL_REQUIRED` | `REQUIRE_APPROVAL` | Same concept, different word order. Cosmetic. |
| — | `BLOCK` | Not in the brief's list. A hard floor breach with no viable alternative. Real and in use. |
| — | `RECOMMEND_ALTERNATIVE` | Not in the brief's list. Blocked, but `RecommendationEngine` found a way out. Real and in use. |
| `REAPPROVAL_REQUIRED` | — | **Does not exist.** Depends entirely on approval-snapshot + material-change detection, which is unbuilt (see below). Not a naming gap — a missing feature. |
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

## Approval snapshot / reapproval (Phase 3 — not built)

No `approval_snapshots` table, no capture-on-approve, no
compare-against-snapshot-on-change logic exists yet. This is the biggest
piece of unbuilt Phase 3 semantics and the reason `REAPPROVAL_REQUIRED` can't
exist yet — there's nothing to compare "current state" against. Scoped
separately since it's a real backend feature (new table + `ApprovalService`
logic + a comparison routine), not a documentation fix. Will draft the
semantic design (what fields go in a snapshot, what counts as "material") as
its own piece once this contract is settled, per your Phase 3 list.

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
