package com.dice.engine.decision;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.Policy;
import com.dice.domain.Product;
import com.dice.domain.enums.DecisionOutcome;
import com.dice.domain.enums.QuotationDecision;
import com.dice.domain.enums.RiskLevel;
import com.dice.engine.approval.ApprovalEngine;
import com.dice.engine.health.DealHealthEngine;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.engine.risk.RiskEngine;
import com.dice.engine.risk.ViolationRiskEngine;
import com.dice.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The orchestrator. Runs the engines in dependency order and collapses their
 * output into one answer: what happens to this deal, and why.
 *
 * <p>Order matters — margin feeds policy, policy feeds approvals and
 * recommendations, and everything feeds the health score. Each engine stays
 * ignorant of the others; this class is the only place that knows the sequence.
 *
 * <p>Deliberately free of repository and transaction concerns: callers hand in
 * the data, which makes the whole decision path unit-testable without a database.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DecisionResolver {

    private final MarginEngine marginEngine;
    private final RiskEngine riskEngine;
    private final ViolationRiskEngine violationRiskEngine;
    private final PolicyEngine policyEngine;
    private final ApprovalEngine approvalEngine;
    private final RecommendationEngine recommendationEngine;
    private final DealHealthEngine healthEngine;

    public Resolution resolve(Deal deal, Context context) {
        Customer customer = deal.getCustomer();

        MarginEngine.MarginResult margin = marginEngine.compute(deal);
        RiskEngine.RiskAssessment risk = riskEngine.assess(deal, customer);
        PolicyEngine.PolicyReport policies =
                policyEngine.evaluate(deal, customer, margin, context.policies());

        List<PolicyEngine.LineDiscountEvaluation> lineDiscounts =
                policyEngine.evaluateLineDiscounts(deal, customer, context.policies());
        ViolationRiskEngine.RiskResult violationRisk = violationRiskEngine.assess(deal, lineDiscounts);

        List<ApprovalEngine.Requirement> approvals = approvalEngine.determineRequired(deal, policies);
        List<RecommendationEngine.Recommendation> recommendations =
                recommendationEngine.recommend(deal, margin, policies, context.catalogue());
        DealHealthEngine.HealthScore health = healthEngine.score(deal, margin, risk, policies);

        DecisionOutcome outcome = decideOutcome(policies, recommendations);
        String rationale = explain(outcome, policies, margin, risk, approvals);
        QuotationDecisionResult quotationDecision = decideQuotation(deal, policies, approvals, violationRisk);

        log.debug("Deal {} resolved as {} ({} violation(s), {} approval(s))",
                deal.getDealNumber(), outcome, policies.violations().size(), approvals.size());

        return new Resolution(outcome, rationale, margin, risk, policies,
                approvals, recommendations, health, violationRisk, quotationDecision);
    }

    /**
     * The DealFlow360-facing view of the same evaluation: a coarser decision
     * vocabulary than {@link DecisionOutcome}, aimed at "what should the rep do
     * next" rather than "what does the deal's status become". Orchestrates the
     * results above — it never re-derives a policy or risk number itself.
     *
     * <p>Never produces {@link QuotationDecision#REAPPROVAL_REQUIRED} — same
     * reasoning as {@link DecisionOutcome#REAPPROVAL_REQUIRED} (see {@link #explain}):
     * this resolver only looks at current state and has no notion of
     * "previously approved with this exact configuration." An earlier version
     * approximated it with {@code deal.getStatus() == APPROVED}, but that fires
     * on <em>any</em> re-evaluation of an approved deal — including a bare
     * {@code POST /api/deals/{id}/evaluate} with no underlying change — not
     * just a genuine one. {@code DealService} is where a real comparison
     * against the last granted {@code ApprovalSnapshot} happens
     * ({@code MaterialChangeDetector}); it promotes both {@code DecisionOutcome}
     * and, as a follow-up, this result to {@code REAPPROVAL_REQUIRED} only when
     * that comparison finds an actual material change.
     */
    private QuotationDecisionResult decideQuotation(Deal deal,
                                                    PolicyEngine.PolicyReport policies,
                                                    List<ApprovalEngine.Requirement> approvals,
                                                    ViolationRiskEngine.RiskResult violationRisk) {
        List<String> reasons = new ArrayList<>();
        policies.violations().forEach(v -> reasons.add(v.policyCode()));
        violationRisk.reasons().forEach(r -> {
            if (!reasons.contains(r)) {
                reasons.add(r);
            }
        });

        boolean atRisk = policies.hasBlocking() || violationRisk.level() == RiskLevel.CRITICAL;
        boolean needsApproval = !policies.requiringApproval().isEmpty() || violationRisk.level() == RiskLevel.HIGH;

        QuotationDecision decision;
        if (atRisk) {
            decision = QuotationDecision.DEAL_AT_RISK;
        } else if (needsApproval) {
            decision = QuotationDecision.APPROVAL_REQUIRED;
        } else if (policies.isClean()) {
            decision = QuotationDecision.ORDER_READY;
        } else {
            decision = QuotationDecision.NO_ACTION;
        }

        boolean approvalRequired = decision == QuotationDecision.APPROVAL_REQUIRED
                || decision == QuotationDecision.REAPPROVAL_REQUIRED;
        List<String> requiredApprovals = approvals.stream()
                .map(a -> a.role().name())
                .distinct()
                .toList();
        String nextAction = nextActionFor(decision, approvals);

        return new QuotationDecisionResult(decision, violationRisk.score(), approvalRequired,
                requiredApprovals, nextAction, List.copyOf(reasons));
    }

    private String nextActionFor(QuotationDecision decision, List<ApprovalEngine.Requirement> approvals) {
        return switch (decision) {
            case APPROVAL_REQUIRED, REAPPROVAL_REQUIRED -> approvals.isEmpty()
                    ? "WAIT_FOR_" + Role.SALES_MANAGER.name()
                    : "WAIT_FOR_" + approvals.get(0).role().name();
            case DEAL_AT_RISK -> "ESCALATE_TO_" + Role.ADMIN.name();
            case ORDER_READY, NO_ACTION -> "NONE";
        };
    }

    /**
     * A blocking breach stops the deal — unless we can offer a way out, in which
     * case the rep gets alternatives rather than a dead end.
     */
    private DecisionOutcome decideOutcome(PolicyEngine.PolicyReport policies,
                                          List<RecommendationEngine.Recommendation> recommendations) {
        if (policies.hasBlocking()) {
            return recommendations.isEmpty()
                    ? DecisionOutcome.BLOCK
                    : DecisionOutcome.RECOMMEND_ALTERNATIVE;
        }
        if (!policies.requiringApproval().isEmpty()) {
            return DecisionOutcome.REQUIRE_APPROVAL;
        }
        return DecisionOutcome.AUTO_APPROVE;
    }

    /**
     * Builds the plain-English explanation stored on the {@code Decision}. This
     * is what a rep or auditor reads, so it names the specific policies rather
     * than saying "policy violation".
     */
    private String explain(DecisionOutcome outcome,
                           PolicyEngine.PolicyReport policies,
                           MarginEngine.MarginResult margin,
                           RiskEngine.RiskAssessment risk,
                           List<ApprovalEngine.Requirement> approvals) {

        String headline = switch (outcome) {
            case AUTO_APPROVE -> "Within policy on all %d checks — no approval needed."
                    .formatted(policies.evaluatedPolicyCodes().size());
            case REQUIRE_APPROVAL -> "Needs sign-off from %s."
                    .formatted(approvals.stream()
                            .map(r -> r.role().name())
                            .collect(Collectors.joining(", ")));
            case BLOCK -> "Blocked: a hard commercial floor was breached and no alternative was found.";
            case RECOMMEND_ALTERNATIVE ->
                    "Blocked as configured, but viable alternatives are available.";
            // Never actually produced here — this resolver only looks at current
            // state and has no notion of "previously approved." DealService applies
            // this outcome afterward, with its own rationale, when a
            // MaterialChangeDetector finds the deal drifted from its last granted
            // ApprovalSnapshot. Case exists only so this switch stays exhaustive.
            case REAPPROVAL_REQUIRED -> "Unreachable: DecisionResolver never produces this outcome.";
        };

        StringBuilder sb = new StringBuilder(headline);
        sb.append("\nMargin %s%% | Risk %s (%d/100)".formatted(
                margin.marginPercent(), risk.level(), risk.score()));

        if (!policies.violations().isEmpty()) {
            sb.append("\nBreaches:");
            for (PolicyEngine.Violation v : policies.violations()) {
                sb.append("\n  [%s] %s — %s".formatted(v.severity(), v.policyCode(), v.message()));
            }
        }
        return sb.toString();
    }

    /**
     * Reference data the resolver needs. Loaded once by the caller so the engines
     * stay free of repository dependencies.
     */
    public record Context(List<Policy> policies, List<Product> catalogue) {

        public static Context of(List<Policy> policies, List<Product> catalogue) {
            return new Context(List.copyOf(policies), List.copyOf(catalogue));
        }
    }

    /** Everything the engines concluded, ready to be persisted or serialised. */
    public record Resolution(
            DecisionOutcome outcome,
            String rationale,
            MarginEngine.MarginResult margin,
            RiskEngine.RiskAssessment risk,
            PolicyEngine.PolicyReport policies,
            List<ApprovalEngine.Requirement> approvals,
            List<RecommendationEngine.Recommendation> recommendations,
            DealHealthEngine.HealthScore health,
            ViolationRiskEngine.RiskResult violationRisk,
            QuotationDecisionResult quotationDecision) {

        public boolean needsHumanDecision() {
            return outcome != DecisionOutcome.AUTO_APPROVE;
        }
    }

    /**
     * The DealFlow360 decision shape: {@code decision}/{@code nextAction} tell
     * the rep what to do, {@code requiredApprovals} and {@code reasons} explain
     * why. Deliberately silent on fulfillment/billing — see {@link QuotationDecision}.
     */
    public record QuotationDecisionResult(
            QuotationDecision decision,
            int riskScore,
            boolean approvalRequired,
            List<String> requiredApprovals,
            String nextAction,
            List<String> reasons) {
    }
}
