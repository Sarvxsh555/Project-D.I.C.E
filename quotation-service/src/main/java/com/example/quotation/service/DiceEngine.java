package com.example.quotation.service;

import com.example.quotation.model.Customer;
import com.example.quotation.model.Product;
import com.example.quotation.model.Quotation;
import com.example.quotation.model.QuotationLine;
import com.example.quotation.repository.CustomerRepository;
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

    public record Decision(
            double riskScore,
            boolean autoApprove,
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

    private static final double AUTO_APPROVE_RISK = 40.0;
    private static final double MARGIN_FLOOR = 20.0;
    private static final double DEAL_VALUE_FINANCE = 50_00_000;
    private static final double BLENDED_OVERAGE_FINANCE = 8.0;
    private static final double ANOMALY_DISCOUNT = 25.0;

    private final CustomerRepository customers;
    private final ProductRepository products;

    public DiceEngine(CustomerRepository customers, ProductRepository products) {
        this.customers = customers;
        this.products = products;
    }

    public Decision evaluate(Quotation quotation) {
        Customer customer = customers.findById(quotation.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

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
            double ceiling = lineCeiling(customer.getTier(), category);
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

        if (quotation.getMarginPercent() < MARGIN_FLOOR) {
            double deficit = MARGIN_FLOOR - quotation.getMarginPercent();
            risk += deficit * 1.5;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("MARGIN_FLOOR: gross margin " + round(quotation.getMarginPercent())
                    + "% is below " + (int) MARGIN_FLOOR + "%");
        }

        if (quotation.getTotal() > DEAL_VALUE_FINANCE) {
            risk += 15;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("DEAL_VALUE: total exceeds standard sales authority (Rs. 50L)");
        }

        if (blendedOverage >= BLENDED_OVERAGE_FINANCE) {
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("BLENDED_FINANCE: combined overage " + round(blendedOverage)
                    + " pts requires Finance as well as Manager");
        }

        if (overallDiscount >= ANOMALY_DISCOUNT) {
            required = highest(required, RequiredLevel.SALES_MANAGER);
            risk += 10;
            reasons.add("DISCOUNT_ANOMALY: overall " + round(overallDiscount)
                    + "% is well above a typical quote and needs a human look");
        }

        if (risk >= AUTO_APPROVE_RISK && required == RequiredLevel.NONE) {
            required = RequiredLevel.SALES_MANAGER;
            reasons.add("RISK_THRESHOLD: score " + round(risk) + " is at/above " + (int) AUTO_APPROVE_RISK
                    + " so Manager review is required even with no single ceiling break");
        }

        boolean goldFastTrack = isPremiumTier(customer.getTier())
                && !anyLineOver
                && overallDiscount < 10
                && quotation.getMarginPercent() >= MARGIN_FLOOR
                && quotation.getTotal() <= DEAL_VALUE_FINANCE;

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
        if (autoApprove) {
            reasons.add("AUTO_APPROVE: risk " + round(Math.min(risk, 100))
                    + " and policy allow the quote to skip the human queue");
        }

        return new Decision(Math.min(risk, 100), autoApprove, required, chain, reasons, categoryBreakdown);
    }

    private static boolean isPremiumTier(String tier) {
        if (tier == null) return false;
        String t = tier.toLowerCase(Locale.ROOT);
        return t.contains("gold") || t.contains("platinum");
    }

    private static boolean isService(String category) {
        return category != null && category.toLowerCase(Locale.ROOT).contains("service");
    }

    static double lineCeiling(String tier, String category) {
        double byTier = switch (tier == null ? "" : tier.toLowerCase(Locale.ROOT)) {
            case "bronze" -> 5;
            case "silver" -> 10;
            case "gold" -> 15;
            case "platinum" -> 20;
            default -> 10;
        };
        if (isService(category)) {
            return Math.min(byTier, 10);
        }
        return byTier;
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
