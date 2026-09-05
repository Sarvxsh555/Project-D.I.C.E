package com.example.governance.rules;

import com.example.governance.client.DiscountRuleDto;
import com.example.governance.client.QuoteDto;
import org.jeasy.rules.annotation.Action;
import org.jeasy.rules.annotation.Condition;
import org.jeasy.rules.annotation.Fact;
import org.jeasy.rules.annotation.Priority;
import org.jeasy.rules.annotation.Rule;

@Rule(name = "discount-ceiling", description = "Line discount exceeds the tier/category ceiling configured in Discount Policies")
public class DiscountCeilingRule {

    @Priority
    public int priority() {
        return 1;
    }

    @Condition
    public boolean evaluate(@Fact("ctx") GovernanceContext ctx) {
        return ctx.quote.lines != null && !ctx.quote.lines.isEmpty();
    }

    @Action
    public void apply(@Fact("ctx") GovernanceContext ctx) {
        for (QuoteDto.Line line : ctx.quote.lines) {
            String category = ctx.productCategoryById.get(line.productId);
            if (category == null) continue;

            DiscountRuleDto matchingRule = ctx.discountRules.stream()
                    .filter(r -> r.customerTier.equalsIgnoreCase(ctx.customerTier) && r.category.equalsIgnoreCase(category))
                    .findFirst()
                    .orElse(null);
            if (matchingRule == null) continue;

            if (line.discountPercent > matchingRule.maxDiscount) {
                double excess = line.discountPercent - matchingRule.maxDiscount;
                ctx.flag(
                        String.format("%s discount (%.1f%%) exceeds %s ceiling (%.1f%%) for %s",
                                category, line.discountPercent, ctx.customerTier, matchingRule.maxDiscount, line.productName),
                        excess * 2.0,
                        RequiredLevel.fromAdminLabel(matchingRule.approvalLevel));
            }
        }
    }
}
