package com.example.quotation.controller;

import com.example.quotation.model.Product;
import com.example.quotation.model.RecommendationRule;
import com.example.quotation.repository.ProductRepository;
import com.example.quotation.repository.RecommendationRuleRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationRuleRepository rules;
    private final ProductRepository products;

    public RecommendationController(RecommendationRuleRepository rules, ProductRepository products) {
        this.rules = rules;
        this.products = products;
    }

    /** Given the products already in the cart, suggest add-ons not already present. */
    @GetMapping
    public List<Map<String, Object>> forCart(@RequestParam List<Long> productIds) {
        Set<Long> inCart = Set.copyOf(productIds);

        return productIds.stream()
                .flatMap(id -> rules.findByProductAIdOrderByPriorityAsc(id).stream())
                .filter(rule -> !inCart.contains(rule.getProductBId()))
                .map(rule -> {
                    Product baseProduct = products.findById(rule.getProductAId()).orElse(null);
                    Product recommended = products.findById(rule.getProductBId()).orElse(null);
                    return Map.<String, Object>of(
                            "productId", rule.getProductBId(),
                            "productName", recommended != null ? recommended.getName() : "Unknown",
                            "reason", "Frequently purchased with " + (baseProduct != null ? baseProduct.getName() : "this item"),
                            "coPurchaseScore", rule.getCoPurchaseScore(),
                            "marginImpactPercent", rule.getMarginImpactPercent(),
                            "promotion", rule.getPromotion());
                })
                .distinct()
                .toList();
    }
}
