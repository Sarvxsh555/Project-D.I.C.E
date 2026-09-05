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
import java.util.List;
import java.util.Locale;

/**
 * Self-governing quote brain. Ten named rules decide risk, who must sign, and whether
 * the pipeline can skip humans. Policy lives here — not in the UI.
 */
@Service
public class IntelligenceService {

    public enum RequiredLevel { NONE, SALES_MANAGER, FINANCE }

    public record Decision(
            double riskScore,
            boolean autoApprove,
            RequiredLevel requiredLevel,
            List<String> chain,
            List<String> reasons
    ) {}

    private static final double AUTO_APPROVE_RISK = 40.0;
    private static final double MARGIN_FLOOR = 20.0;
    private static final double DEAL_VALUE_FINANCE = 50_00_000;
    private static final double BLENDED_OVERAGE_FINANCE = 8.0;
    private static final double ANOMALY_DISCOUNT = 25.0;

    private final CustomerRepository customers;
    private final ProductRepository products;

    public IntelligenceService(CustomerRepository customers, ProductRepository products) {
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

        // 1. Baseline risk from overall discount depth (even when under ceiling).
        risk += overallDiscount * 1.2;
        reasons.add("BASELINE_DISCOUNT: overall discount " + round(overallDiscount) + "% contributes "
                + round(overallDiscount * 1.2) + " risk");

        for (QuotationLine line : quotation.getLines()) {
            Product product = products.findById(line.getProductId()).orElse(null);
            String category = product != null ? product.getCategory() : "General";
            double ceiling = lineCeiling(customer.getTier(), category);
            double over = line.getDiscountPercent() - ceiling;
            if (over > 0) {
                anyLineOver = true;
                blendedOverage += over;
                risk += over * 2.0;
                required = highest(required, RequiredLevel.SALES_MANAGER);
                reasons.add("LINE_CEILING: " + line.getProductName() + " at " + round(line.getDiscountPercent())
                        + "% exceeds " + customer.getTier() + "/" + category + " ceiling " + ceiling + "%");
                if (isService(category) && over > 0) {
                    serviceOver = true;
                    required = highest(required, RequiredLevel.SALES_MANAGER);
                }
            }
        }

        // 2. Blended small overages across many lines still route.
        if (blendedOverage > 0 && blendedOverage < 8 && anyLineOver) {
            reasons.add("BLENDED_OVERAGE: stacked overages total " + round(blendedOverage)
                    + " points — pattern cannot slip as 'each line is almost fine'");
        }

        // 3. Service lines are stricter — a single service overage flags the whole quote.
        if (serviceOver) {
            reasons.add("SERVICE_LINE_STRICT: a thin-margin service line broke its own ceiling");
        }

        // 4. Highest required level wins when categories mix.
        // 5. Margin floor → Finance.
        if (quotation.getMarginPercent() < MARGIN_FLOOR) {
            double deficit = MARGIN_FLOOR - quotation.getMarginPercent();
            risk += deficit * 1.5;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("MARGIN_FLOOR: gross margin " + round(quotation.getMarginPercent())
                    + "% is below " + (int) MARGIN_FLOOR + "%");
        }

        // 6. Large deal value → Finance.
        if (quotation.getTotal() > DEAL_VALUE_FINANCE) {
            risk += 15;
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("DEAL_VALUE: total exceeds standard sales authority (Rs. 50L)");
        }

        // 7. Stacked overages past the blended finance line.
        if (blendedOverage >= BLENDED_OVERAGE_FINANCE) {
            required = highest(required, RequiredLevel.FINANCE);
            reasons.add("BLENDED_FINANCE: combined overage " + round(blendedOverage)
                    + " pts requires Finance as well as Manager");
        }

        // 8. Anomaly: very deep overall discount even if lines look legal.
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

        // 9. Gold/Platinum fast-track auto-approve when every line is inside policy.
        if (goldFastTrack) {
            reasons.add("TIER_FAST_TRACK: " + customer.getTier()
                    + " quote is inside every ceiling, margin is healthy, value is under authority");
        }

        boolean autoApprove = required == RequiredLevel.NONE || goldFastTrack;
        if (goldFastTrack) {
            required = RequiredLevel.NONE;
        }

        // 10. Skip Finance when only Manager is required; build the chain from the winner.
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

        return new Decision(Math.min(risk, 100), autoApprove, required, chain, reasons);
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
}
