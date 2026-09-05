package com.example.governance.rules;

import org.jeasy.rules.annotation.Action;
import org.jeasy.rules.annotation.Condition;
import org.jeasy.rules.annotation.Fact;
import org.jeasy.rules.annotation.Priority;
import org.jeasy.rules.annotation.Rule;

/** Always contributes a baseline risk signal from the overall discount %, even when no
 *  ceiling is breached - a 14% discount just under a 15% ceiling is still riskier than a 2%
 *  discount, and the score should reflect that gradient, not just pass/fail. */
@Rule(name = "baseline-discount-risk", description = "Baseline risk contribution from overall discount depth")
public class BaselineDiscountRiskRule {

    @Priority
    public int priority() {
        return 0;
    }

    @Condition
    public boolean evaluate(@Fact("ctx") GovernanceContext ctx) {
        return ctx.quote.subtotal > 0;
    }

    @Action
    public void apply(@Fact("ctx") GovernanceContext ctx) {
        double overallDiscountPercent = ctx.quote.discountTotal / ctx.quote.subtotal * 100.0;
        ctx.riskScore += overallDiscountPercent * 1.2;
    }
}
