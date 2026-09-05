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

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
