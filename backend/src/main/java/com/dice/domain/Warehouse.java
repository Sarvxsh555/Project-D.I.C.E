package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** A stocking location, mirrored from Odoo's {@code stock.warehouse}. */
@Entity
@Table(name = "warehouses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "odoo_warehouse_id", unique = true)
    private Long odooWarehouseId;

    @Column(nullable = false, unique = true, length = 16)
    private String code;

    @Column(nullable = false)
    private String name;

    private String region;

    /** Days to ship from here; {@code FulfillmentEngine} ranks on this. */
    @Column(name = "dispatch_days")
    @Builder.Default
    private Integer dispatchDays = 1;

    /**
     * Relative shipping-cost multiplier used by the allocation engine's
     * warehouse ranking; 1.00 is baseline, higher is costlier to ship from.
     */
    @Column(name = "shipping_cost_factor", precision = 6, scale = 2)
    @Builder.Default
    private java.math.BigDecimal shippingCostFactor = java.math.BigDecimal.ONE;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
