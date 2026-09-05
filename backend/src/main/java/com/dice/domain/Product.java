package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/** A sellable item, mirrored from Odoo's {@code product.product}. */
@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "odoo_product_id", unique = true)
    private Long odooProductId;

    @Column(nullable = false, unique = true, length = 64)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(length = 64)
    private String category;

    @Column(name = "list_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal listPrice;

    /** Cost basis for margin maths. Never exposed to the portal. */
    @Column(name = "standard_cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal standardCost;

    /** Hard price floor; {@code PolicyEngine} treats a breach as BLOCKING. */
    @Column(name = "floor_price", precision = 18, scale = 2)
    private BigDecimal floorPrice;

    @Column(length = 16)
    @Builder.Default
    private String uom = "UNIT";

    @Column(name = "stock_on_hand")
    @Builder.Default
    private Integer stockOnHand = 0;

    @Column(name = "lead_time_days")
    @Builder.Default
    private Integer leadTimeDays = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
