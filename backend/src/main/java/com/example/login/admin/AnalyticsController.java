package com.example.login.admin;

import com.example.login.model.User;
import com.example.login.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        List<Product> allProducts = products.findAll();
        List<Warehouse> allWarehouses = warehouses.findAll();
        List<User> allUsers = users.findAll();

        List<Map<String, Object>> productPerformance = allProducts.stream()
                .sorted(Comparator.comparingDouble(Product::getUnitPrice).reversed())
                .limit(8)
                .map(p -> Map.<String, Object>of("label", p.getName(), "value", p.getUnitPrice()))
                .toList();

        // Real distribution of configured discount rules by risk level (low/medium/high).
        Map<String, Long> byRisk = discountRules.findAll().stream()
                .collect(Collectors.groupingBy(
                        r -> r.getRiskLevel() == null ? "unspecified" : r.getRiskLevel(),
                        Collectors.counting()));
        List<Map<String, Object>> discountDistribution = byRisk.entrySet().stream()
                .map(e -> Map.<String, Object>of("label", e.getKey(), "value", e.getValue()))
                .toList();

        // Real distribution of logins by role - stands in for team composition until a
        // dedicated sales-performance data source exists.
        Map<String, Long> byRole = allUsers.stream()
                .collect(Collectors.groupingBy(User::getRole, Collectors.counting()));
        List<Map<String, Object>> usersByRole = byRole.entrySet().stream()
                .map(e -> Map.<String, Object>of("label", e.getKey(), "value", e.getValue()))
                .toList();

        double avgListPrice = allProducts.isEmpty()
                ? 0
                : allProducts.stream().mapToDouble(Product::getUnitPrice).average().orElse(0);
        long activeProducts = allProducts.stream().filter(p -> "active".equals(p.getStatus())).count();
        int totalStock = allWarehouses.stream().mapToInt(Warehouse::getStock).sum();

        return Map.of(
                "stats", List.of(
                        Map.of("label", "Users", "value", String.valueOf(allUsers.size())),
                        Map.of("label", "Catalog products", "value", String.valueOf(allProducts.size())),
                        Map.of("label", "Active products", "value", String.valueOf(activeProducts)),
                        Map.of("label", "Discount rules", "value", String.valueOf(discountRules.count())),
                        Map.of("label", "Warehouses", "value", String.valueOf(allWarehouses.size())),
                        Map.of("label", "Total warehouse stock", "value", String.valueOf(totalStock)),
                        Map.of("label", "Avg. list price", "value", String.format("%.2f", avgListPrice))),
                "discountDistribution", discountDistribution,
                "productPerformance", productPerformance,
                "salesPerformance", usersByRole);
    }
}
