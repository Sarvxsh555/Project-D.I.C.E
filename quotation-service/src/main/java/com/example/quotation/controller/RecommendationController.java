package com.example.quotation.controller;

import com.example.quotation.model.Product;
import com.example.quotation.model.RecommendationRule;
import com.example.quotation.repository.ProductRepository;
import com.example.quotation.repository.RecommendationRuleRepository;
import com.example.quotation.service.CoPurchaseStats;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationRuleRepository rules;
    private final ProductRepository products;
    private final CoPurchaseStats coPurchaseStats;

    public RecommendationController(RecommendationRuleRepository rules, ProductRepository products,
                                     CoPurchaseStats coPurchaseStats) {
        this.rules = rules;
        this.products = products;
        this.coPurchaseStats = coPurchaseStats;
    }

    /**
     * Given the products already in the cart, suggest add-ons not already present.
     *
     * Configured rules still decide what may be recommended and carry the commercial terms
     * (margin impact, promotion). What changed is where the strength comes from: if the quote
     * history actually shows how often the pair sells together, that observed confidence wins
     * over the seeded constant. Pairs the history surfaces but no rule covers are appended
     * afterwards so the catalogue can grow its own suggestions.
     */
    @GetMapping
    public List<Map<String, Object>> forCart(@RequestParam List<Long> productIds) {
        Set<Long> inCart = Set.copyOf(productIds);
        Set<Long> alreadySuggested = new LinkedHashSet<>();
        List<Map<String, Object>> out = new ArrayList<>();

        // 1. Configured rules, re-scored from observed history where we have any.
        for (Long anchorId : productIds) {
            for (RecommendationRule rule : rules.findByProductAIdOrderByPriorityAsc(anchorId)) {
                Long suggestedId = rule.getProductBId();
                if (suggestedId == null || inCart.contains(suggestedId) || !alreadySuggested.add(suggestedId)) {
                    continue;
                }
                Product baseProduct = products.findById(anchorId).orElse(null);
                Product recommended = products.findById(suggestedId).orElse(null);
                CoPurchaseStats.Observation observed = coPurchaseStats.observe(anchorId, suggestedId);

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("productId", suggestedId);
                row.put("productName", recommended != null ? recommended.getName() : "Unknown");
                row.put("reason", reasonFor(baseProduct, observed));
                row.put("coPurchaseScore", observed != null ? observed.confidence() : rule.getCoPurchaseScore());
                row.put("configuredCoPurchaseScore", rule.getCoPurchaseScore());
                row.put("coPurchaseSource", observed != null ? "observed" : "configured");
                row.put("observedPairCount", observed != null ? observed.pairCount() : 0);
                row.put("marginImpactPercent", rule.getMarginImpactPercent());
                row.put("promotion", rule.getPromotion());
                out.add(row);
            }
        }

        // 2. Pairs the history shows but no rule covers.
        for (Long anchorId : productIds) {
            for (Map.Entry<Long, CoPurchaseStats.Observation> entry : coPurchaseStats.rankedPartners(anchorId)) {
                Long suggestedId = entry.getKey();
                if (inCart.contains(suggestedId) || !alreadySuggested.add(suggestedId)) continue;
                Product recommended = products.findById(suggestedId).orElse(null);
                if (recommended == null) continue;

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("productId", suggestedId);
                row.put("productName", recommended.getName());
                row.put("reason", reasonFor(products.findById(anchorId).orElse(null), entry.getValue()));
                row.put("coPurchaseScore", entry.getValue().confidence());
                row.put("configuredCoPurchaseScore", null);
                row.put("coPurchaseSource", "discovered");
                row.put("observedPairCount", entry.getValue().pairCount());
                row.put("marginImpactPercent", listMarginPercent(recommended));
                row.put("promotion", "none");
                out.add(row);
            }
        }

        return out;
    }

    private static String reasonFor(Product baseProduct, CoPurchaseStats.Observation observed) {
        String base = baseProduct != null ? baseProduct.getName() : "this item";
        if (observed == null) {
            return "Frequently purchased with " + base;
        }
        return String.format("On %d of %d quotes containing %s", observed.pairCount(), observed.anchorCount(), base);
    }

    /** Catalogue margin for a product, used when no rule supplies a configured margin impact. */
    private static double listMarginPercent(Product product) {
        double unitPrice = product.getUnitPrice();
        if (unitPrice <= 0) return 0;
        return Math.round(((unitPrice - product.getCostPrice()) / unitPrice) * 1000.0) / 10.0;
    }
}
