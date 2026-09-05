package com.dice.service;

import com.dice.domain.CoPurchasePair;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Product;
import com.dice.domain.ProductRecommendation;
import com.dice.domain.RecommendationResult;
import com.dice.repository.CoPurchasePairRepository;
import com.dice.repository.DealRepository;
import com.dice.repository.ProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Deterministic Co-purchase Recommendation Engine.
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Extract trigger SKUs currently on the deal.</li>
 *   <li>Fetch active co-purchase candidate pairs from the database.</li>
 *   <li>Remove candidate products already present on the deal.</li>
 *   <li>Discard candidates with unhealthy margins (< 15% floor).</li>
 *   <li>Apply promotion weighting (+50% bonus on base score).</li>
 *   <li>Compute deterministic score, human-readable reason, and margin delta.</li>
 *   <li>Rank deterministically by score (descending), tie-broken by SKU (ascending).</li>
 *   <li>Return top-N recommendations.</li>
 * </ol>
 *
 * <p>All calculations are strictly server-side — client parameters or filtering
 * cannot bypass the engine's policies.
 */
@Service
@Slf4j
public class CoPurchaseRecommendationService {

    public static final int DEFAULT_LIMIT = 5;
    public static final BigDecimal DEFAULT_MIN_HEALTHY_MARGIN = new BigDecimal("15.00");

    private final CoPurchasePairRepository coPurchasePairRepository;
    private final ProductRepository productRepository;
    private final DealRepository dealRepository;
    private final BigDecimal minHealthyMargin;

    @Autowired
    public CoPurchaseRecommendationService(CoPurchasePairRepository coPurchasePairRepository,
                                          ProductRepository productRepository,
                                          DealRepository dealRepository) {
        this(coPurchasePairRepository, productRepository, dealRepository, DEFAULT_MIN_HEALTHY_MARGIN);
    }

    public CoPurchaseRecommendationService(CoPurchasePairRepository coPurchasePairRepository,
                                          ProductRepository productRepository,
                                          DealRepository dealRepository,
                                          BigDecimal minHealthyMargin) {
        this.coPurchasePairRepository = coPurchasePairRepository;
        this.productRepository = productRepository;
        this.dealRepository = dealRepository;
        this.minHealthyMargin = minHealthyMargin != null ? minHealthyMargin : DEFAULT_MIN_HEALTHY_MARGIN;
    }

    @Transactional(readOnly = true)
    public RecommendationResult recommend(UUID dealId) {
        return recommend(dealId, DEFAULT_LIMIT);
    }

    @Transactional(readOnly = true)
    public RecommendationResult recommend(UUID dealId, int limit) {
        Deal deal = dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
        return recommend(deal, limit);
    }

    public RecommendationResult recommend(Deal deal, int limit) {
        if (deal == null) {
            return new RecommendationResult(null, null, List.of());
        }

        UUID dealId = deal.getId();
        String dealNumber = deal.getDealNumber();

        // 1. Current products on deal
        Map<String, String> existingProductNamesBySku = new HashMap<>();
        if (deal.getLines() != null) {
            for (DealLine line : deal.getLines()) {
                if (line.getProduct() != null && line.getProduct().getSku() != null) {
                    existingProductNamesBySku.put(line.getProduct().getSku(), line.getProduct().getName());
                }
            }
        }

        if (existingProductNamesBySku.isEmpty()) {
            return new RecommendationResult(dealId, dealNumber, List.of());
        }

        Set<String> triggerSkus = existingProductNamesBySku.keySet();

        // 2. Fetch co-purchase candidates
        List<CoPurchasePair> pairs = coPurchasePairRepository.findByProductSkuInAndActiveTrue(new ArrayList<>(triggerSkus));
        if (pairs == null || pairs.isEmpty()) {
            return new RecommendationResult(dealId, dealNumber, List.of());
        }

        // 3. Filter out candidates already on the deal
        List<CoPurchasePair> filteredPairs = pairs.stream()
                .filter(p -> !triggerSkus.contains(p.getPairedSku()))
                .toList();

        if (filteredPairs.isEmpty()) {
            return new RecommendationResult(dealId, dealNumber, List.of());
        }

        // Group by paired SKU
        Map<String, List<CoPurchasePair>> pairsByPairedSku = filteredPairs.stream()
                .collect(Collectors.groupingBy(CoPurchasePair::getPairedSku));

        List<ProductRecommendation> candidates = new ArrayList<>();

        for (Map.Entry<String, List<CoPurchasePair>> entry : pairsByPairedSku.entrySet()) {
            String pairedSku = entry.getKey();
            List<CoPurchasePair> candidatePairs = entry.getValue();

            Optional<Product> optProduct = productRepository.findBySku(pairedSku);
            if (optProduct.isEmpty()) {
                continue;
            }
            Product product = optProduct.get();
            if (!product.isActive()) {
                continue;
            }

            // 4. Remove unhealthy margin products
            if (!isHealthyMargin(product)) {
                log.debug("Excluding candidate SKU {} due to unhealthy margin", pairedSku);
                continue;
            }

            // 5. Aggregate base weight and promotion bonus
            int baseWeight = candidatePairs.stream()
                    .mapToInt(p -> p.getWeight() != null ? p.getWeight() : 1)
                    .sum();

            String promotion = candidatePairs.stream()
                    .map(CoPurchasePair::getPromotionLabel)
                    .filter(label -> label != null && !label.isBlank())
                    .findFirst()
                    .orElse(null);

            // Deterministic score calculation: +50% bonus if promotion applies
            int score = (promotion != null)
                    ? (int) Math.round(baseWeight * 1.5)
                    : baseWeight;

            // Trigger explanation: find highest-weight trigger pair
            CoPurchasePair topTriggerPair = candidatePairs.stream()
                    .max(Comparator.comparingInt(p -> p.getWeight() != null ? p.getWeight() : 1))
                    .orElse(candidatePairs.get(0));

            String triggerName = existingProductNamesBySku.getOrDefault(
                    topTriggerPair.getProductSku(), topTriggerPair.getProductSku());
            String reason = "Frequently purchased with " + triggerName;

            // 6. Margin delta calculation
            BigDecimal marginDelta = computeMarginDelta(deal, product);

            candidates.add(new ProductRecommendation(
                    pairedSku,
                    product.getName(),
                    score,
                    reason,
                    marginDelta,
                    promotion
            ));
        }

        // 7. Deterministic ranking: score descending, then SKU ascending for tie-break
        Comparator<ProductRecommendation> comparator = Comparator
                .comparingInt(ProductRecommendation::score).reversed()
                .thenComparing(ProductRecommendation::productSku);

        int maxLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        List<ProductRecommendation> ranked = candidates.stream()
                .sorted(comparator)
                .limit(maxLimit)
                .toList();

        return new RecommendationResult(dealId, dealNumber, ranked);
    }

    private boolean isHealthyMargin(Product product) {
        if (product.getListPrice() == null || product.getListPrice().signum() <= 0
                || product.getStandardCost() == null) {
            return false;
        }
        if (product.getStandardCost().compareTo(product.getListPrice()) >= 0) {
            return false;
        }
        BigDecimal marginPercent = product.getListPrice().subtract(product.getStandardCost())
                .divide(product.getListPrice(), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        return marginPercent.compareTo(minHealthyMargin) >= 0;
    }

    private BigDecimal computeMarginDelta(Deal deal, Product product) {
        BigDecimal productList = product.getListPrice();
        BigDecimal productCost = product.getStandardCost();

        if (productList == null || productCost == null || productList.signum() <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal dealTotal = deal.getTotalAmount();
        if (dealTotal == null || dealTotal.signum() <= 0 || deal.getLines() == null || deal.getLines().isEmpty()) {
            BigDecimal standaloneMargin = productList.subtract(productCost)
                    .divide(productList, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            return standaloneMargin.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal currentCost = deal.getLines().stream()
                .filter(l -> l.getProduct() != null && l.getProduct().getStandardCost() != null)
                .map(l -> l.getProduct().getStandardCost().multiply(BigDecimal.valueOf(l.getQuantity() != null ? l.getQuantity() : 1)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentMargin = deal.getMarginPercent() != null ? deal.getMarginPercent() : BigDecimal.ZERO;

        BigDecimal newRevenue = dealTotal.add(productList);
        BigDecimal newCost = currentCost.add(productCost);

        BigDecimal newMargin = newRevenue.subtract(newCost)
                .divide(newRevenue, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        return newMargin.subtract(currentMargin).setScale(2, RoundingMode.HALF_UP);
    }
}
