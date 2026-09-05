package com.dice.engine.margin;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MarginEngineTest {

    private final MarginEngine engine = new MarginEngine();

    private Product product(String sku, String cost) {
        return Product.builder()
                .sku(sku)
                .name(sku)
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal(cost))
                .active(true)
                .build();
    }

    private DealLine line(Product product, int quantity, String unitPrice, String discountPercent) {
        return DealLine.builder()
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal(unitPrice))
                .discountPercent(new BigDecimal(discountPercent))
                .build();
    }

    private Deal dealOf(DealLine... lines) {
        Deal deal = Deal.builder().build();
        for (DealLine line : lines) {
            deal.addLine(line);
        }
        return deal;
    }

    @Test
    void noDiscountMatchesGrossAndDiscountedRevenue() {
        Deal deal = dealOf(line(product("SKU-1", "60.00"), 10, "100.00", "0"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.revenue()).isEqualByComparingTo("1000.00");
        assertThat(result.discountedRevenue()).isEqualByComparingTo("1000.00");
        assertThat(result.cost()).isEqualByComparingTo("600.00");
        assertThat(result.marginAmount()).isEqualByComparingTo("400.00");
        assertThat(result.marginPercent()).isEqualByComparingTo("40.0000");
    }

    @Test
    void discountLowersDiscountedRevenueAndMarginButNotGrossRevenue() {
        Deal deal = dealOf(line(product("SKU-1", "60.00"), 10, "100.00", "10"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.revenue()).isEqualByComparingTo("1000.00");
        assertThat(result.discountedRevenue()).isEqualByComparingTo("900.00");
        assertThat(result.cost()).isEqualByComparingTo("600.00");
        assertThat(result.marginAmount()).isEqualByComparingTo("300.00");
        assertThat(result.marginPercent()).isEqualByComparingTo(
                new BigDecimal("300.00").divide(new BigDecimal("900.00"), 10, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(4, java.math.RoundingMode.HALF_UP));
    }

    @Test
    void multipleLinesAggregateAcrossTheDeal() {
        Deal deal = dealOf(
                line(product("SKU-1", "60.00"), 10, "100.00", "0"),
                line(product("SKU-2", "20.00"), 5, "50.00", "0"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.lines()).hasSize(2);
        assertThat(result.revenue()).isEqualByComparingTo("1250.00");
        assertThat(result.cost()).isEqualByComparingTo("700.00");
        assertThat(result.marginAmount()).isEqualByComparingTo("550.00");
    }

    @Test
    void zeroQuantityLineContributesNothing() {
        Deal deal = dealOf(line(product("SKU-1", "60.00"), 0, "100.00", "0"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.revenue()).isEqualByComparingTo("0.00");
        assertThat(result.cost()).isEqualByComparingTo("0.00");
        assertThat(result.marginPercent()).isEqualByComparingTo("0.0000");
    }

    @Test
    void negativeQuantityLineIsTreatedAsInvalidAndContributesNothing() {
        Deal deal = dealOf(line(product("SKU-1", "60.00"), -5, "100.00", "0"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.revenue()).isEqualByComparingTo("0.00");
        assertThat(result.cost()).isEqualByComparingTo("0.00");
    }

    @Test
    void lowMarginIsReportedAccuratelyRatherThanClamped() {
        // Sells at cost plus a sliver: margin should read a thin positive percentage.
        Deal deal = dealOf(line(product("SKU-1", "95.00"), 1, "100.00", "0"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.marginAmount()).isEqualByComparingTo("5.00");
        assertThat(result.marginPercent()).isEqualByComparingTo("5.0000");
        assertThat(result.weakestLine()).isPresent();
    }

    @Test
    void fullyDiscountedLineYieldsZeroMarginPercentInsteadOfDividingByZero() {
        Deal deal = dealOf(line(product("SKU-1", "60.00"), 10, "100.00", "100"));

        MarginEngine.MarginResult result = engine.compute(deal);

        assertThat(result.discountedRevenue()).isEqualByComparingTo("0.00");
        assertThat(result.marginPercent()).isEqualByComparingTo("0.0000");
    }
}
