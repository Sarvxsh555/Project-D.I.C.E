package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.PriceList;
import com.dice.domain.PriceListItem;
import com.dice.domain.Product;
import com.dice.domain.enums.CustomerSegment;
import com.dice.repository.PriceListItemRepository;
import com.dice.repository.PriceListRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PriceResolutionServiceTest {

    @Mock
    private PriceListRepository priceListRepository;

    @Mock
    private PriceListItemRepository priceListItemRepository;

    private PriceResolutionService service;

    private Product product;
    private PriceList standardList;
    private PriceList goldList;

    @BeforeEach
    void setUp() {
        service = new PriceResolutionService(priceListRepository, priceListItemRepository);

        product = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-1001")
                .name("Standard Widget")
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal("60.00"))
                .active(true)
                .build();

        standardList = PriceList.builder()
                .id(UUID.randomUUID())
                .code("STANDARD")
                .name("Standard Pricing")
                .currency("USD")
                .priority(100)
                .active(true)
                .build();

        goldList = PriceList.builder()
                .id(UUID.randomUUID())
                .code("GOLD-TIER")
                .name("Gold Tier Pricing")
                .currency("USD")
                .customerTier("GOLD")
                .priority(10)
                .active(true)
                .build();
    }

    private Customer customer(CustomerSegment segment, String tier) {
        return Customer.builder()
                .id(UUID.randomUUID())
                .name("Test Customer")
                .segment(segment)
                .tier(tier)
                .build();
    }

    @Test
    void resolvesTierSpecificPriceOverDefault() {
        when(priceListRepository.findByActiveTrueOrderByPriorityAsc())
                .thenReturn(List.of(goldList, standardList));
        when(priceListItemRepository.findByPriceListIdAndProductId(goldList.getId(), product.getId()))
                .thenReturn(Optional.of(item(goldList, "90.00")));

        PriceResolutionService.ResolvedPrice resolved =
                service.resolve(customer(CustomerSegment.ENTERPRISE, "GOLD"), product);

        assertThat(resolved.unitPrice()).isEqualByComparingTo("90.00");
        assertThat(resolved.priceListCode()).isEqualTo("GOLD-TIER");
        assertThat(resolved.source()).isEqualTo(PriceResolutionService.PriceSource.PRICE_LIST);
    }

    @Test
    void fallsBackToDefaultListWhenTierHasNoItem() {
        when(priceListRepository.findByActiveTrueOrderByPriorityAsc())
                .thenReturn(List.of(goldList, standardList));
        when(priceListItemRepository.findByPriceListIdAndProductId(goldList.getId(), product.getId()))
                .thenReturn(Optional.empty());
        when(priceListItemRepository.findByPriceListIdAndProductId(standardList.getId(), product.getId()))
                .thenReturn(Optional.of(item(standardList, "100.00")));

        PriceResolutionService.ResolvedPrice resolved =
                service.resolve(customer(CustomerSegment.ENTERPRISE, "GOLD"), product);

        assertThat(resolved.unitPrice()).isEqualByComparingTo("100.00");
        assertThat(resolved.priceListCode()).isEqualTo("STANDARD");
    }

    @Test
    void skipsTierListThatDoesNotMatchCustomer() {
        when(priceListRepository.findByActiveTrueOrderByPriorityAsc())
                .thenReturn(List.of(goldList, standardList));
        when(priceListItemRepository.findByPriceListIdAndProductId(standardList.getId(), product.getId()))
                .thenReturn(Optional.of(item(standardList, "100.00")));

        PriceResolutionService.ResolvedPrice resolved =
                service.resolve(customer(CustomerSegment.SMB, "SILVER"), product);

        assertThat(resolved.priceListCode()).isEqualTo("STANDARD");
    }

    @Test
    void fallsBackToProductListPriceWhenNoPriceListItemExists() {
        when(priceListRepository.findByActiveTrueOrderByPriorityAsc()).thenReturn(List.of());

        PriceResolutionService.ResolvedPrice resolved =
                service.resolve(customer(CustomerSegment.SMB, "BRONZE"), product);

        assertThat(resolved.unitPrice()).isEqualByComparingTo("100.00");
        assertThat(resolved.source()).isEqualTo(PriceResolutionService.PriceSource.PRODUCT_LIST_PRICE);
    }

    @Test
    void throwsClearErrorWhenNoPriceCanBeResolved() {
        product.setListPrice(null);
        when(priceListRepository.findByActiveTrueOrderByPriorityAsc()).thenReturn(List.of());

        assertThatThrownBy(() -> service.resolve(customer(CustomerSegment.SMB, "BRONZE"), product))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SKU-1001");
    }

    @Test
    void throwsClearErrorForInactiveProduct() {
        product.setActive(false);

        assertThatThrownBy(() -> service.resolve(customer(CustomerSegment.SMB, "BRONZE"), product))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inactive");
    }

    private PriceListItem item(PriceList list, String price) {
        return PriceListItem.builder()
                .id(UUID.randomUUID())
                .priceList(list)
                .product(product)
                .unitPrice(new BigDecimal(price))
                .build();
    }
}
