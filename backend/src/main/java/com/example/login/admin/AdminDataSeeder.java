package com.example.login.admin;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminDataSeeder implements CommandLineRunner {

    private final ProductRepository products;
    private final PriceListRepository priceLists;
    private final DiscountRuleRepository discountRules;
    private final WarehouseRepository warehouses;
    private final SubscriptionPlanRepository subscriptionPlans;
    private final RecommendationRuleRepository recommendationRules;

    public AdminDataSeeder(ProductRepository products, PriceListRepository priceLists,
                            DiscountRuleRepository discountRules, WarehouseRepository warehouses,
                            SubscriptionPlanRepository subscriptionPlans,
                            RecommendationRuleRepository recommendationRules) {
        this.products = products;
        this.priceLists = priceLists;
        this.discountRules = discountRules;
        this.warehouses = warehouses;
        this.subscriptionPlans = subscriptionPlans;
        this.recommendationRules = recommendationRules;
    }

    @Override
    public void run(String... args) {
        if (products.count() == 0) {
            products.save(product("Wireless Mouse", "Electronics", "Black / Bluetooth", 8, "each",
                    "Ergonomic wireless mouse with USB-C charging.", "active"));
            products.save(product("Running Shoes", "Sporting Goods", "Size 10 / Blue", 5, "each",
                    "Lightweight trainers for daily runs.", "active"));
            products.save(product("Stainless Steel Kettle", "Home & Kitchen", "1.7L", 12, "each",
                    "Fast-boil electric kettle.", "archived"));
            products.save(product("A4 Copy Paper", "Office Supplies", "500 sheets", 0, "box",
                    "Standard 80gsm office paper.", "active"));
        }

        if (priceLists.count() == 0) {
            priceLists.save(price("Gold", "USD", "Wireless Mouse", 24.99, "2026-01-01", "active"));
            priceLists.save(price("Silver", "USD", "Running Shoes", 59.0, "2026-02-15", "active"));
            priceLists.save(price("Platinum", "EUR", "Stainless Steel Kettle", 39.5, "2025-11-01", "inactive"));
            priceLists.save(price("Bronze", "INR", "A4 Copy Paper", 350, "2026-03-01", "active"));
        }

        if (discountRules.count() == 0) {
            discountRules.save(rule("Gold", "Electronics", 5, 15, "low", "Sales Manager"));
            discountRules.save(rule("Platinum", "Apparel", 10, 30, "medium", "Finance"));
            discountRules.save(rule("Silver", "Home & Kitchen", 0, 10, "low", "Sales Manager"));
            discountRules.save(rule("Bronze", "Sporting Goods", 15, 40, "high", "Finance"));
        }

        if (warehouses.count() == 0) {
            warehouses.save(warehouse("North DC", "Chicago, IL", 12500, "Weekly", "Standard"));
            warehouses.save(warehouse("West Hub", "Reno, NV", 8300, "Bi-weekly", "Heavy"));
            warehouses.save(warehouse("South Depot", "Atlanta, GA", 15900, "Weekly", "Standard"));
        }

        if (subscriptionPlans.count() == 0) {
            subscriptionPlans.save(plan("Starter Monthly", "Monthly", 9.99, "Enabled", "End of cycle", "None"));
            subscriptionPlans.save(plan("Pro Quarterly", "Quarterly", 24.99, "Enabled", "Immediate", "Prorated"));
            subscriptionPlans.save(plan("Enterprise Yearly", "Yearly", 199.0, "Disabled", "End of cycle", "Full within 14 days"));
        }

        if (recommendationRules.count() == 0) {
            recommendationRules.save(recommendation("Wireless Mouse", "USB-C Hub", 0.72, "Bundle 10% off", 15, 1));
            recommendationRules.save(recommendation("Running Shoes", "Athletic Socks", 0.61, "None", 20, 2));
            recommendationRules.save(recommendation("Stainless Steel Kettle", "Tea Set", 0.45, "Free shipping", 12, 3));
        }
    }

    private Product product(String name, String category, String variant, double taxRate, String unit,
                             String description, String status) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setVariant(variant);
        p.setTaxRate(taxRate);
        p.setUnit(unit);
        p.setDescription(description);
        p.setStatus(status);
        return p;
    }

    private PriceListEntry price(String tier, String currency, String productName, double amount,
                                  String effectiveDate, String status) {
        PriceListEntry e = new PriceListEntry();
        e.setCustomerTier(tier);
        e.setCurrency(currency);
        e.setProduct(productName);
        e.setPrice(amount);
        e.setEffectiveDate(effectiveDate);
        e.setStatus(status);
        return e;
    }

    private DiscountRule rule(String tier, String category, double min, double max, String risk, String approval) {
        DiscountRule r = new DiscountRule();
        r.setCustomerTier(tier);
        r.setCategory(category);
        r.setMinDiscount(min);
        r.setMaxDiscount(max);
        r.setRiskLevel(risk);
        r.setApprovalLevel(approval);
        return r;
    }

    private Warehouse warehouse(String name, String location, int stock, String replenishment, String shippingWeight) {
        Warehouse w = new Warehouse();
        w.setName(name);
        w.setLocation(location);
        w.setStock(stock);
        w.setReplenishment(replenishment);
        w.setShippingWeight(shippingWeight);
        return w;
    }

    private SubscriptionPlan plan(String name, String billingCycle, double price, String proration,
                                   String cancellation, String refund) {
        SubscriptionPlan p = new SubscriptionPlan();
        p.setName(name);
        p.setBillingCycle(billingCycle);
        p.setPrice(price);
        p.setProration(proration);
        p.setCancellation(cancellation);
        p.setRefund(refund);
        return p;
    }

    private RecommendationRule recommendation(String productA, String productB, double score, String promotion,
                                               double margin, int priority) {
        RecommendationRule r = new RecommendationRule();
        r.setProductA(productA);
        r.setProductB(productB);
        r.setCoPurchaseScore(score);
        r.setPromotion(promotion);
        r.setMinimumMargin(margin);
        r.setPriority(priority);
        return r;
    }
}
