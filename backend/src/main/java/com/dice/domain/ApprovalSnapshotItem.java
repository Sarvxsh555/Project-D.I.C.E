package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One {@link DealLine} as it stood when its deal's {@link ApprovalSnapshot} was
 * taken. Denormalised (SKU/name copied, not FK'd to the live product) on
 * purpose — a later product or price change must not alter history.
 */
@Entity
@Table(name = "approval_snapshot_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalSnapshotItem {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private ApprovalSnapshot snapshot;

    @Column(name = "product_sku", nullable = false, length = 64)
    private String productSku;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "discount_percent", nullable = false, precision = 7, scale = 4)
    private BigDecimal discountPercent;

    @Column(name = "line_total", nullable = false, precision = 18, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    private BigDecimal marginPercent;
}
