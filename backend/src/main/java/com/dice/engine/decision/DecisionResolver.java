package com.dice.engine.decision;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.Policy;
import com.dice.domain.Product;
import com.dice.domain.enums.DecisionOutcome;
import com.dice.engine.approval.ApprovalEngine;
import com.dice.engine.health.DealHealthEngine;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.engine.risk.RiskEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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

        List<ApprovalEngine.Requirement> approvals = approvalEngine.determineRequired(deal, policies);
        List<RecommendationEngine.Recommendation> recommendations =
                recommendationEngine.recommend(deal, margin, policies, context.catalogue());
        DealHealthEngine.HealthScore health = healthEngine.score(deal, margin, risk, policies);

        DecisionOutcome outcome = decideOutcome(policies, recommendations);
        String rationale = explain(outcome, policies, margin, risk, approvals);

        log.debug("Deal {} resolved as {} ({} violation(s), {} approval(s))",
                deal.getDealNumber(), outcome, policies.violations().size(), approvals.size());

        return new Resolution(outcome, rationale, margin, risk, policies,
                approvals, recommendations, health);
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
            DealHealthEngine.HealthScore health) {

        public boolean needsHumanDecision() {
            return outcome != DecisionOutcome.AUTO_APPROVE;
        }
    }
}
