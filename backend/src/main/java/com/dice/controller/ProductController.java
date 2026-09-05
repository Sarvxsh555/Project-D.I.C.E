package com.dice.controller;

import com.dice.domain.Product;
import com.dice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Read-only product catalogue — see {@link CustomerController} for why this
 * exists. Injects {@link ProductRepository} directly rather than adding a
 * pass-through service, matching {@code DashboardController}'s existing
 * repository-direct pattern for simple reads.
 *
 * <p>Deliberately omits {@code standardCost}: cost basis is internal margin
 * data, the same category of thing the customer portal must never see (see
 * docs/architecture.md's portal authorization rule) — no reason to leak it to
 * every caller of a general product listing either.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public List<ProductSummary> list() {
        return productRepository.findByActiveTrue().stream().map(ProductSummary::from).toList();
    }

    @GetMapping("/{id}")
    public ProductSummary get(@PathVariable UUID id) {
        return productRepository.findById(id)
                .map(ProductSummary::from)
                .orElseThrow(() -> new IllegalArgumentException("No product with id " + id));
    }

    public record ProductSummary(
            UUID id, String sku, String name, String category,
            BigDecimal listPrice, String uom, Integer stockOnHand, Integer leadTimeDays) {

        static ProductSummary from(Product product) {
            return new ProductSummary(product.getId(), product.getSku(), product.getName(),
                    product.getCategory(), product.getListPrice(), product.getUom(),
                    product.getStockOnHand(), product.getLeadTimeDays());
        }
    }
}
