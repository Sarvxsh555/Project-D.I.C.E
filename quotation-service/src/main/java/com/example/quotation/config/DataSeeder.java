package com.example.quotation.config;

import com.example.quotation.model.Customer;
import com.example.quotation.model.CustomerPrice;
import com.example.quotation.model.Product;
import com.example.quotation.model.RecommendationRule;
import com.example.quotation.repository.CustomerPriceRepository;
import com.example.quotation.repository.CustomerRepository;
import com.example.quotation.repository.ProductRepository;
import com.example.quotation.repository.RecommendationRuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final ProductRepository products;
    private final CustomerRepository customers;
    private final CustomerPriceRepository customerPrices;
    private final RecommendationRuleRepository recommendationRules;

    public DataSeeder(ProductRepository products, CustomerRepository customers,
                       CustomerPriceRepository customerPrices, RecommendationRuleRepository recommendationRules) {
        this.products = products;
        this.customers = customers;
        this.customerPrices = customerPrices;
        this.recommendationRules = recommendationRules;
    }

    @Override
    public void run(String... args) {
        if (products.count() == 0) {
            Product enterpriseServer = product("Enterprise Server", "Electronics", "Rack / 2U", 8500, 5200, 18);
            Product premiumSupport = product("Premium Support", "Services", "Annual", 1200, 300, 18);
            Product wirelessMouse = product("Wireless Mouse", "Electronics", "Black / Bluetooth", 24.99, 12, 12);
            Product usbHub = product("USB-C Hub", "Electronics", "7-in-1", 39.99, 18, 12);
            Product runningShoes = product("Running Shoes", "Sporting Goods", "Size 10 / Blue", 59, 28, 5);
            Product athleticSocks = product("Athletic Socks", "Sporting Goods", "3-pack", 12, 4, 5);

            products.save(enterpriseServer);
            products.save(premiumSupport);
            products.save(wirelessMouse);
            products.save(usbHub);
            products.save(runningShoes);
            products.save(athleticSocks);

            recommendationRules.save(recommendation(enterpriseServer.getId(), premiumSupport.getId(), 0.81,
                    "20% promotional pricing", 3.6, 1));
            recommendationRules.save(recommendation(wirelessMouse.getId(), usbHub.getId(), 0.72,
                    "Bundle 10% off", 2.1, 2));
            recommendationRules.save(recommendation(runningShoes.getId(), athleticSocks.getId(), 0.61,
                    "None", 1.4, 3));
        }

        if (customers.count() == 0) {
            Customer acme = customer("Acme Corp", "Gold", "buyer@acme.com", "North");
            customer("Globex Inc", "Platinum", "procurement@globex.com", "West");
            customer("Initech", "Silver", "orders@initech.com", "South");
            customer("Umbrella LLC", "Bronze", "contact@umbrella.com", "East");

            products.findAll().stream()
                    .filter(p -> p.getName().equals("Enterprise Server"))
                    .findFirst()
                    .ifPresent(server -> {
                        CustomerPrice price = new CustomerPrice();
                        price.setCustomerId(acme.getId());
                        price.setProductId(server.getId());
                        price.setPrice(7900); // negotiated rate for a Gold-tier account
                        customerPrices.save(price);
                    });
        }
    }

    private Product product(String name, String category, String variant, double unitPrice, double costPrice, double taxRate) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setVariant(variant);
        p.setUnitPrice(unitPrice);
        p.setCostPrice(costPrice);
        p.setTaxRate(taxRate);
        return products.save(p);
    }

    private Customer customer(String name, String tier, String email, String region) {
        Customer c = new Customer();
        c.setName(name);
        c.setTier(tier);
        c.setEmail(email);
        c.setRegion(region);
        return customers.save(c);
    }

    private RecommendationRule recommendation(Long productAId, Long productBId, double score, String promotion,
                                               double marginImpact, int priority) {
        RecommendationRule r = new RecommendationRule();
        r.setProductAId(productAId);
        r.setProductBId(productBId);
        r.setCoPurchaseScore(score);
        r.setPromotion(promotion);
        r.setMarginImpactPercent(marginImpact);
        r.setPriority(priority);
        return r;
    }
}
