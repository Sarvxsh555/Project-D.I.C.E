package com.example.governance.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Mirrors backend's admin DiscountRule - customer tier + category ceiling, as configured
 *  by an admin in the Discount Policies screen. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class DiscountRuleDto {
    public Long id;
    public String customerTier;
    public String category;
    public double minDiscount;
    public double maxDiscount;
    public String riskLevel;
    public String approvalLevel; // "Sales Manager" | "Finance"
}
