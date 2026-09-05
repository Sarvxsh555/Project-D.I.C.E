package com.dice.domain;

import com.dice.domain.enums.FulfillmentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/** One product row on a {@link Deal}. */
@Entity
@Table(name = "deal_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Position in the quotation; keeps line order stable across syncs. */
    @Column(name = "line_number", nullable = false)
    @Builder.Default
    private Integer lineNumber = 1;

    @Column(nullable = false)
    private Integer quantity;

    /** List price captured at the time the line was added. */
    @Column(name = "unit_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "discount_percent", nullable = false, precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    /** Derived: quantity x unitPrice net of discount. */
    @Column(name = "line_total", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal lineTotal = BigDecimal.ZERO;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal marginPercent = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_status", length = 32)
    @Builder.Default
    private FulfillmentStatus fulfillmentStatus = FulfillmentStatus.NOT_STARTED;

    /** Gross value before discount. */
    public BigDecimal grossTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /** Net unit price after the line discount. */
    public BigDecimal netUnitPrice() {
        BigDecimal factor = BigDecimal.ONE.subtract(
                discountPercent.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        return unitPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }
}
