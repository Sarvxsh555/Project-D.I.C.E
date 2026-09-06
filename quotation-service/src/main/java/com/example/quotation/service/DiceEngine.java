package com.example.quotation.service;

import com.example.quotation.model.Customer;
import com.example.quotation.model.Product;
import com.example.quotation.model.Quotation;
import com.example.quotation.model.QuotationLine;
import com.example.quotation.model.DiscountRule;
import com.example.quotation.repository.CustomerRepository;
import com.example.quotation.repository.DiscountRuleRepository;
import com.example.quotation.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * D.I.C.E. — Deal Intelligence & Control Engine.
 * This is the only decision brain. OEEG is not intelligence; it only emits external events.
 */
@Service
public class DiceEngine {

    public enum RequiredLevel { NONE, SALES_MANAGER, FINANCE }

    /**
     * How much oversight the decision actually warrants. Splitting the old boolean into three
     * bands lets confidently-clean quotes skip the queue entirely while borderline ones still
     * go through - approved now, but flagged for a reviewer to look at after the fact.
     */
    public enum ApprovalBand { AUTO, AUTO_WITH_AUDIT, GATE }

    public record Decision(
            double riskScore,
            boolean autoApprove,
            ApprovalBand band,
            RequiredLevel requiredLevel,
            List<String> chain,
            List<String> reasons,
            List<CategoryRisk> categoryBreakdown
    ) {}

    /**
     * Blended risk for one product category: line values within the category are weighted
     * by their own subtotal so a few thin-margin lines can't hide behind a big low-risk one,
     * and a single wild outlier line can't dominate a category that's mostly fine either.
     */
    public record CategoryRisk(
            String category,
            double lineCount,
            double blendedDiscountPercent,
            double ceiling,
            double overage,
            double categoryRiskScore,
            boolean breached
    ) {}

    private final CustomerRepository customers;
    private final ProductRepository products;
    private final DiscountRuleRepository discountRules;
    private final ThresholdConfig thresholds;

    public DiceEngine(CustomerRepository customers, ProductRepository products,
                      DiscountRuleRepository discountRules, ThresholdConfig thresholds) {
        this.customers = customers;
        this.products = products;
        this.discountRules = discountRules;
        this.thresholds = thresholds;
    }

    public Decision evaluate(Quotation quotation) {
        Customer customer = customers.findById(quotation.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        final double autoApproveRisk = thresholds.get(ThresholdConfig.AUTO_APPROVE_RISK);
        final double marginFloor = thresholds.get(ThresholdConfig.MARGIN_FLOOR);
        final double dealValueFinance = thresholds.get(ThresholdConfig.DEAL_VALUE_FINANCE);
        final double blendedOverageFinance = thresholds.get(ThresholdConfig.BLENDED_OVERAGE_FINANCE);
        final double anomalyDiscount = thresholds.get(ThresholdConfig.ANOMALY_DISCOUNT);

        // Admin-configured ceilings win over the built-in tier ladder, loaded once per
        // evaluation so a policy change in the console applies to the very next quote.
        List<DiscountRule> configuredCeilings = loadConfiguredCeilings();

        List<String> reasons = new ArrayList<>();
        double risk = 0;
        RequiredLevel required = RequiredLevel.NONE;
        double blendedOverage = 0;
        boolean anyLineOver = false;
        boolean serviceOver = false;

        double overallDiscount = quotation.getSubtotal() > 0
                ? quotation.getDiscountTotal() / quotation.getSubtotal() * 100.0
                : 0;

        risk += overallDiscount * 1.2;
        reasons.add("BASELINE_DISCOUNT: overall discount " + round(overallDiscount) + "% contributes "
                + round(overallDiscount * 1.2) + " risk");

        Map<String, double[]> valueByCategory = new LinkedHashMap<>(); // [weightedDiscountSum, valueSum, lineCount]
        Map<String, String> categoryDisplay = new LinkedHashMap<>();

        for (QuotationLine line : quotation.getLines()) {
            Product product = products.findById(line.getProductId()).orElse(null);
            String category = product != null ? product.getCategory() : "General";
            String key = category == null ? "General" : category.toLowerCase(Locale.ROOT);
            categoryDisplay.putIfAbsent(key, category == null ? "General" : category);
            double lineValue = Math.max(line.getSubtotal(), 0.01);
            double[] acc = valueByCategory.computeIfAbsent(key, k -> new double[3]);
            acc[0] += line.getDiscountPercent() * lineValue;
            acc[1] += lineValue;
            acc[2] += 1;
        }

        List<CategoryRisk> categoryBreakdown = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : valueByCategory.entrySet()) {
            String category = categoryDisplay.get(entry.getKey());
            double[] acc = entry.getValue();
            double blendedDiscount = acc[1] > 0 ? acc[0] / acc[1] : 0;
            double ceiling = ceilingFor(configuredCeilings, customer.getTier(), category);
            double over = blendedDiscount - ceiling;
            boolean breached = over > 0;
            double categoryRisk = breached ? over * 2.0 : 0;

            if (breached) {
                anyLineOver = true;
                blendedOverage += over;
                risk += categoryRisk;
                required = highest(required, RequiredLevel.SALES_MANAGER);
                reasons.add("CATEGORY_BLEND: " + category + " blended discount " + round(blendedDiscount)
                        + "% across " + (int) acc[2] + " item(s) exceeds " + customer.getTier() + " ceiling " + ceiling + "%");
                if (isService(category)) {
                    serviceOver = true;
                    required = highest(required, RequiredLevel.SALES_MANAGER);
                }
            }

            categoryBreakdown.add(new CategoryRisk(category, acc[2], round2(blendedDiscount), ceiling,
                    round2(Math.max(over, 0)), round2(categoryRisk), breached));
        }

        if (blendedOverage > 0 && blendedOverage < 8 && anyLineOver) {
            reasons.add("BLENDED_OVERAGE: stacked category overages total " + round(blendedOverage)
                    + " points — pattern cannot slip as 'each category is almost fine'");
        }

        if (serviceOver) {
            reasons.add("SERVICE_LINE_STRICT: a thin-margin service category broke its own ceiling");
        }

        if (quotation.getMarginPercent() < marginFloor) {
            double deficit = marginFloor - quotation.getMarginPercent();
            risk += deficit * 1.5;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("MARGIN_FLOOR: gross margin " + round(quotation.getMarginPercent())
                    + "% is below " + (int) marginFloor + "%");
        }

        if (quotation.getTotal() > dealValueFinance) {
            risk += 15;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("DEAL_VALUE: total exceeds standard sales authority (Rs. "
                    + round(dealValueFinance / 1_00_000) + "L)");
        }

        if (blendedOverage >= blendedOverageFinance) {
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("BLENDED_FINANCE: combined overage " + round(blendedOverage)
                    + " pts requires Finance as well as Manager");
        }

        if (overallDiscount >= anomalyDiscount) {
            required = highest(required, RequiredLevel.SALES_MANAGER);
            risk += 10;
            reasons.add("DISCOUNT_ANOMALY: overall " + round(overallDiscount)
                    + "% is well above a typical quote and needs a human look");
        }

        if (risk >= autoApproveRisk && required == RequiredLevel.NONE) {
            required = RequiredLevel.SALES_MANAGER;
            reasons.add("RISK_THRESHOLD: score " + round(risk) + " is at/above " + (int) autoApproveRisk
                    + " so Manager review is required even with no single ceiling break");
        }

        boolean goldFastTrack = isPremiumTier(customer.getTier())
                && !anyLineOver
                && overallDiscount < 10
                && quotation.getMarginPercent() >= marginFloor
                && quotation.getTotal() <= dealValueFinance;

        if (goldFastTrack) {
            reasons.add("TIER_FAST_TRACK: " + customer.getTier()
                    + " quote is inside every ceiling, margin is healthy, value is under authority");
        }

        boolean autoApprove = required == RequiredLevel.NONE || goldFastTrack;
        if (goldFastTrack) {
            required = RequiredLevel.NONE;
        }

        List<String> chain = switch (required) {
            case FINANCE -> List.of("Sales Manager", "Finance");
            case SALES_MANAGER -> List.of("Sales Manager");
            case NONE -> List.of();
        };
        if (required == RequiredLevel.SALES_MANAGER) {
            reasons.add("SKIP_FINANCE: only Sales Manager is required — Finance step omitted");
        }
        double finalRisk = Math.min(risk, 100);

        // Three bands instead of a bare yes/no. Gating behaviour is unchanged - anything that
        // used to require a human still does. The new middle band only marks auto-approved
        // quotes that landed close enough to the line to be worth a post-hoc look.
        double auditFloor = autoApproveRisk - thresholds.get(ThresholdConfig.AUDIT_BAND_WIDTH);
        ApprovalBand band;
        if (!autoApprove) {
            band = ApprovalBand.GATE;
        } else if (!goldFastTrack && finalRisk >= auditFloor) {
            band = ApprovalBand.AUTO_WITH_AUDIT;
        } else {
            band = ApprovalBand.AUTO;
        }

        if (autoApprove) {
            reasons.add("AUTO_APPROVE: risk " + round(finalRisk)
                    + " and policy allow the quote to skip the human queue");
        }
        if (band == ApprovalBand.AUTO_WITH_AUDIT) {
            reasons.add("POST_HOC_AUDIT: risk " + round(finalRisk) + " is within "
                    + round(autoApproveRisk - auditFloor) + " points of the review line — approved now, "
                    + "flagged for after-the-fact review");
        }

        return new Decision(finalRisk, autoApprove, band, required, chain, reasons, categoryBreakdown);
    }

    private static boolean isPremiumTier(String tier) {
        if (tier == null) return false;
        String t = tier.toLowerCase(Locale.ROOT);
        return t.contains("gold") || t.contains("platinum");
    }

    private static boolean isService(String category) {
        return category != null && category.toLowerCase(Locale.ROOT).contains("service");
    }

    private List<DiscountRule> loadConfiguredCeilings() {
        try {
            return discountRules.findAll();
        } catch (RuntimeException ex) {
            // Policy table unavailable - fall back to the built-in tier ladder rather than
            // failing the whole evaluation.
            return List.of();
        }
    }

    /**
     * An admin-configured (tier, category) ceiling wins; otherwise the tier ladder applies,
     * with service categories additionally capped because they carry the thinnest margin.
     */
    double ceilingFor(List<DiscountRule> configured, String tier, String category) {
        for (DiscountRule rule : configured) {
            if (rule.getMaxDiscount() == null) continue;
            if (equalsIgnoreCaseSafe(rule.getCustomerTier(), tier)
                    && equalsIgnoreCaseSafe(rule.getCategory(), category)) {
                return rule.getMaxDiscount();
            }
        }
        return defaultCeiling(tier, category);
    }

    private double defaultCeiling(String tier, String category) {
        double byTier = switch (tier == null ? "" : tier.toLowerCase(Locale.ROOT)) {
            case "bronze" -> thresholds.get(ThresholdConfig.CEILING_BRONZE);
            case "silver" -> thresholds.get(ThresholdConfig.CEILING_SILVER);
            case "gold" -> thresholds.get(ThresholdConfig.CEILING_GOLD);
            case "platinum" -> thresholds.get(ThresholdConfig.CEILING_PLATINUM);
            default -> thresholds.get(ThresholdConfig.CEILING_DEFAULT);
        };
        if (isService(category)) {
            return Math.min(byTier, thresholds.get(ThresholdConfig.CEILING_SERVICE_CAP));
        }
        return byTier;
    }

    private static boolean equalsIgnoreCaseSafe(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    private static RequiredLevel highest(RequiredLevel a, RequiredLevel b) {
        return a.ordinal() >= b.ordinal() ? a : b;
    }

    private static String round(double v) {
        return String.format(Locale.ROOT, "%.1f", v);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
