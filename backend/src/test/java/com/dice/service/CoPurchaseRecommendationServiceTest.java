package com.dice.service;

import com.dice.domain.*;
import com.dice.repository.CoPurchasePairRepository;
import com.dice.repository.DealRepository;
import com.dice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoPurchaseRecommendationServiceTest {

    @Mock private CoPurchasePairRepository coPurchasePairRepository;
    @Mock private ProductRepository productRepository;
    @Mock private DealRepository dealRepository;

    private CoPurchaseRecommendationService service;

    private Product widget;
    private Product premiumWidget;
    private Product gadget;
    private Product proGadget;
    private Product lowMarginProduct;

    @BeforeEach
    void setUp() {
        service = new CoPurchaseRecommendationService(
                coPurchasePairRepository,
                productRepository,
                dealRepository,
                new BigDecimal("15.00")
        );

        widget = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-1001")
                .name("Standard Widget")
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal("60.00"))
                .active(true)
                .build();

        premiumWidget = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-1002")
                .name("Premium Widget")
                .listPrice(new BigDecimal("250.00"))
                .standardCost(new BigDecimal("140.00"))
                .active(true)
                .build();

        gadget = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-2001")
                .name("Basic Gadget")
                .listPrice(new BigDecimal("45.00"))
                .standardCost(new BigDecimal("30.00"))
                .active(true)
                .build();

        proGadget = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-2002")
                .name("Pro Gadget")
                .listPrice(new BigDecimal("180.00"))
                .standardCost(new BigDecimal("95.00"))
                .active(true)
                .build();

        // 10% margin is below the 15% threshold
        lowMarginProduct = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-9999")
                .name("Low Margin Accessory")
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal("90.00"))
                .active(true)
                .build();
    }

    private Deal createDeal(Product... products) {
        Deal deal = Deal.builder()
                .id(UUID.randomUUID())
                .dealNumber("DICE-TEST-001")
                .totalAmount(BigDecimal.ZERO)
                .marginPercent(new BigDecimal("35.00"))
                .lines(new ArrayList<>())
                .build();

        for (Product p : products) {
            DealLine line = DealLine.builder()
                    .id(UUID.randomUUID())
                    .deal(deal)
                    .product(p)
                    .quantity(1)
                    .unitPrice(p.getListPrice())
                    .discountPercent(BigDecimal.ZERO)
                    .lineTotal(p.getListPrice())
                    .marginPercent(new BigDecimal("35.00"))
                    .build();
            deal.getLines().add(line);
            deal.setTotalAmount(deal.getTotalAmount().add(p.getListPrice()));
        }

        return deal;
    }

    @Test
    void testCandidateSelection() {
        Deal deal = createDeal(widget);

        CoPurchasePair pair = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001")
                .weight(8)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(gadget));

        RecommendationResult result = service.recommend(deal, 5);

        assertThat(result.recommendations()).hasSize(1);
        ProductRecommendation rec = result.recommendations().get(0);
        assertThat(rec.productSku()).isEqualTo("SKU-2001");
        assertThat(rec.productName()).isEqualTo("Basic Gadget");
        assertThat(rec.score()).isEqualTo(8);
        assertThat(rec.reason()).contains("Standard Widget");
    }

    @Test
    void testExistingProductsRemoved() {
        // Deal already contains both widget and gadget
        Deal deal = createDeal(widget, gadget);

        CoPurchasePair pair1 = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001") // Already on deal!
                .weight(8)
                .active(true)
                .build();

        CoPurchasePair pair2 = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2002") // Not on deal
                .weight(4)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair1, pair2));
        when(productRepository.findBySku("SKU-2002")).thenReturn(Optional.of(proGadget));

        RecommendationResult result = service.recommend(deal, 5);

        // SKU-2001 should be filtered out because it is already on the deal
        assertThat(result.recommendations()).hasSize(1);
        assertThat(result.recommendations().get(0).productSku()).isEqualTo("SKU-2002");
    }

    @Test
    void testUnhealthyMarginProductsRemoved() {
        Deal deal = createDeal(widget);

        CoPurchasePair pairHealthy = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001")
                .weight(5)
                .active(true)
                .build();

        CoPurchasePair pairUnhealthy = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-9999")
                .weight(10)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pairHealthy, pairUnhealthy));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(gadget));
        when(productRepository.findBySku("SKU-9999")).thenReturn(Optional.of(lowMarginProduct));

        RecommendationResult result = service.recommend(deal, 5);

        // SKU-9999 (10% margin < 15% floor) must be rejected
        assertThat(result.recommendations()).hasSize(1);
        assertThat(result.recommendations().get(0).productSku()).isEqualTo("SKU-2001");
    }

    @Test
    void testPromotionWeightingChangesRanking() {
        Deal deal = createDeal(widget);

        // Pair A has base weight 6, but has a promotion -> score 6 * 1.5 = 9
        CoPurchasePair pairA = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-1002")
                .weight(6)
                .promotionLabel("Upgrade to Premium")
                .active(true)
                .build();

        // Pair B has base weight 7, no promotion -> score 7
        CoPurchasePair pairB = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001")
                .weight(7)
                .promotionLabel(null)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pairA, pairB));
        when(productRepository.findBySku("SKU-1002")).thenReturn(Optional.of(premiumWidget));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(gadget));

        RecommendationResult result = service.recommend(deal, 5);

        assertThat(result.recommendations()).hasSize(2);
        // Due to +50% promotion boost, SKU-1002 (score 9) ranks higher than SKU-2001 (score 7)
        assertThat(result.recommendations().get(0).productSku()).isEqualTo("SKU-1002");
        assertThat(result.recommendations().get(0).score()).isEqualTo(9);
        assertThat(result.recommendations().get(0).promotion()).isEqualTo("Upgrade to Premium");

        assertThat(result.recommendations().get(1).productSku()).isEqualTo("SKU-2001");
        assertThat(result.recommendations().get(1).score()).isEqualTo(7);
        assertThat(result.recommendations().get(1).promotion()).isNull();
    }

    @Test
    void testScoreIsDeterministic() {
        Deal deal = createDeal(widget);

        CoPurchasePair pair1 = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001")
                .weight(8)
                .active(true)
                .build();

        CoPurchasePair pair2 = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2002")
                .weight(4)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair1, pair2));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(gadget));
        when(productRepository.findBySku("SKU-2002")).thenReturn(Optional.of(proGadget));

        RecommendationResult run1 = service.recommend(deal, 5);
        RecommendationResult run2 = service.recommend(deal, 5);

        assertThat(run1.recommendations()).hasSize(2);
        assertThat(run2.recommendations()).hasSize(2);

        for (int i = 0; i < run1.recommendations().size(); i++) {
            ProductRecommendation r1 = run1.recommendations().get(i);
            ProductRecommendation r2 = run2.recommendations().get(i);
            assertThat(r1.productSku()).isEqualTo(r2.productSku());
            assertThat(r1.score()).isEqualTo(r2.score());
            assertThat(r1.marginDelta()).isEqualTo(r2.marginDelta());
        }
    }

    @Test
    void testReasonMarginDeltaPromotionPopulated() {
        Deal deal = createDeal(widget);

        CoPurchasePair pair = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-1002")
                .weight(6)
                .promotionLabel("Special Discount")
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair));
        when(productRepository.findBySku("SKU-1002")).thenReturn(Optional.of(premiumWidget));

        RecommendationResult result = service.recommend(deal, 5);

        assertThat(result.recommendations()).hasSize(1);
        ProductRecommendation rec = result.recommendations().get(0);

        assertThat(rec.reason()).isNotBlank();
        assertThat(rec.reason()).contains("Standard Widget");
        assertThat(rec.marginDelta()).isNotNull();
        assertThat(rec.promotion()).isEqualTo("Special Discount");
    }

    @Test
    void testTopRecommendationsReturnedWithLimit() {
        Deal deal = createDeal(widget);

        CoPurchasePair pair1 = CoPurchasePair.builder()
                .productSku("SKU-1001").pairedSku("SKU-1002").weight(9).active(true).build();
        CoPurchasePair pair2 = CoPurchasePair.builder()
                .productSku("SKU-1001").pairedSku("SKU-2001").weight(6).active(true).build();
        CoPurchasePair pair3 = CoPurchasePair.builder()
                .productSku("SKU-1001").pairedSku("SKU-2002").weight(3).active(true).build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair1, pair2, pair3));
        when(productRepository.findBySku("SKU-1002")).thenReturn(Optional.of(premiumWidget));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(gadget));
        when(productRepository.findBySku("SKU-2002")).thenReturn(Optional.of(proGadget));

        // Limit to top 2
        RecommendationResult result = service.recommend(deal, 2);

        assertThat(result.recommendations()).hasSize(2);
        assertThat(result.recommendations().get(0).productSku()).isEqualTo("SKU-1002");
        assertThat(result.recommendations().get(1).productSku()).isEqualTo("SKU-2001");
    }

    @Test
    void testEmptyCandidateSetHandled() {
        // Deal with empty lines
        Deal emptyDeal = Deal.builder()
                .id(UUID.randomUUID())
                .lines(List.of())
                .build();

        RecommendationResult result = service.recommend(emptyDeal, 5);
        assertThat(result.recommendations()).isEmpty();

        // Deal with lines but no pairs found
        Deal deal = createDeal(widget);
        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of());

        RecommendationResult resultNoPairs = service.recommend(deal, 5);
        assertThat(resultNoPairs.recommendations()).isEmpty();
    }

    @Test
    void testInactiveProductExcluded() {
        Deal deal = createDeal(widget);

        Product inactiveGadget = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-2001")
                .name("Old Gadget")
                .listPrice(new BigDecimal("45.00"))
                .standardCost(new BigDecimal("30.00"))
                .active(false) // inactive!
                .build();

        CoPurchasePair pair = CoPurchasePair.builder()
                .productSku("SKU-1001")
                .pairedSku("SKU-2001")
                .weight(8)
                .active(true)
                .build();

        when(coPurchasePairRepository.findByProductSkuInAndActiveTrue(any()))
                .thenReturn(List.of(pair));
        when(productRepository.findBySku("SKU-2001")).thenReturn(Optional.of(inactiveGadget));

        RecommendationResult result = service.recommend(deal, 5);
        assertThat(result.recommendations()).isEmpty();
    }
}
