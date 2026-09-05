package com.example.login.admin;

import com.example.login.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
public class AnalyticsController {

    private final ProductRepository products;
    private final UserRepository users;
    private final DiscountRuleRepository discountRules;
    private final WarehouseRepository warehouses;

    public AnalyticsController(
            ProductRepository products,
            UserRepository users,
            DiscountRuleRepository discountRules,
            WarehouseRepository warehouses) {
        this.products = products;
        this.users = users;
        this.discountRules = discountRules;
        this.warehouses = warehouses;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<Map<String, Object>> productPerformance = products.findAll().stream()
                .limit(8)
                .map(p -> Map.<String, Object>of("label", p.getName(), "value", p.getUnitPrice()))
                .toList();

        return Map.of(
                "stats", List.of(
                        Map.of("label", "Users", "value", String.valueOf(users.count())),
                        Map.of("label", "Catalog products", "value", String.valueOf(products.count())),
                        Map.of("label", "Discount rules", "value", String.valueOf(discountRules.count())),
                        Map.of("label", "Warehouses", "value", String.valueOf(warehouses.count()))),
                "discountDistribution", List.of(),
                "productPerformance", productPerformance,
                "salesPerformance", List.of());
    }
}
