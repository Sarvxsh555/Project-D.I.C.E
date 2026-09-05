package com.dice.domain;

import com.dice.domain.enums.FulfillmentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * One warehouse/product/quantity split within a {@link FulfillmentPlan}.
 * {@code warehouse} is {@code null} for a backordered remainder.
 */
@Entity
@Table(name = "fulfillment_allocation_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FulfillmentAllocationLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private FulfillmentPlan plan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_line_id", nullable = false)
    private DealLine dealLine;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Null when this row represents a backordered remainder. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private FulfillmentStatus status;
}
