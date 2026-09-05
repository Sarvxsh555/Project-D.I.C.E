package com.example.governance.rules;

import org.jeasy.rules.annotation.Action;
import org.jeasy.rules.annotation.Condition;
import org.jeasy.rules.annotation.Fact;
import org.jeasy.rules.annotation.Priority;
import org.jeasy.rules.annotation.Rule;

@Rule(name = "deal-value-ceiling", description = "Deal value exceeds standard sales authority")
public class DealValueRule {

    private static final double CEILING = 50_00_000; // Rs. 50L

    @Priority
    public int priority() {
        return 3;
    }

    @Condition
    public boolean evaluate(@Fact("ctx") GovernanceContext ctx) {
        return ctx.quote.total > CEILING;
    }

    @Action
    public void apply(@Fact("ctx") GovernanceContext ctx) {
        ctx.flag(
                String.format("Deal value (Rs. %,.0f) exceeds standard sales authority (Rs. 50L)", ctx.quote.total),
                15,
                RequiredLevel.FINANCE);
    }
}
