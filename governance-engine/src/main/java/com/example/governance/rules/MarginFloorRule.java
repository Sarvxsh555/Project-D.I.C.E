package com.example.governance.rules;

import org.jeasy.rules.annotation.Action;
import org.jeasy.rules.annotation.Condition;
import org.jeasy.rules.annotation.Fact;
import org.jeasy.rules.annotation.Priority;
import org.jeasy.rules.annotation.Rule;

@Rule(name = "margin-floor", description = "Gross margin has fallen below the acceptable floor")
public class MarginFloorRule {

    private static final double FLOOR = 20.0;

    @Priority
    public int priority() {
        return 2;
    }

    @Condition
    public boolean evaluate(@Fact("ctx") GovernanceContext ctx) {
        return ctx.quote.marginPercent < FLOOR;
    }

    @Action
    public void apply(@Fact("ctx") GovernanceContext ctx) {
        double deficit = FLOOR - ctx.quote.marginPercent;
        ctx.flag(
                String.format("Gross margin (%.1f%%) is below the %.0f%% floor", ctx.quote.marginPercent, FLOOR),
                deficit * 1.5,
                RequiredLevel.FINANCE);
    }
}
