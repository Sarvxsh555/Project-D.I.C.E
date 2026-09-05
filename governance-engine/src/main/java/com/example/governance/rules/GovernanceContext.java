package com.example.governance.rules;

import com.example.governance.client.DiscountRuleDto;
import com.example.governance.client.QuoteDto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Everything the rule set reads from and writes into for one evaluation run. */
public class GovernanceContext {
    public final QuoteDto quote;
    public final String customerTier;
    public final Map<Long, String> productCategoryById;
    public final List<DiscountRuleDto> discountRules;

    public double riskScore = 0;
    public RequiredLevel requiredLevel = RequiredLevel.NONE;
    public final List<String> reasons = new ArrayList<>();

    public GovernanceContext(QuoteDto quote, String customerTier, Map<Long, String> productCategoryById,
                              List<DiscountRuleDto> discountRules) {
        this.quote = quote;
        this.customerTier = customerTier;
        this.productCategoryById = productCategoryById;
        this.discountRules = discountRules;
    }

    public void flag(String reason, double riskContribution, RequiredLevel level) {
        reasons.add(reason);
        riskScore += riskContribution;
        requiredLevel = RequiredLevel.highestOf(requiredLevel, level);
    }

    public double clampedRiskScore() {
        return Math.max(0, Math.min(100, Math.round(riskScore * 100.0) / 100.0));
    }
}
