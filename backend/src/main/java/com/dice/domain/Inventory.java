package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Stock for one product at one warehouse. The authoritative source for
 * availability — never trust a frontend-supplied quantity.
 *
 * <p>{@code availableQty + reservedQty} is stock physically on hand and not
 * yet shipped; {@code fulfilledQty} is a running total of what has shipped
 * out of this location. Reservation/fulfilment moves are always atomic
 * (see {@code InventoryService}), guarded by the {@link #version} optimistic
 * lock plus a pessimistic read-for-update on the hot path.
 */
@Entity
@Table(name = "inventory", uniqueConstraints = {
        @UniqueConstraint(name = "uk_inventory_warehouse_product", columnNames = {"warehouse_id", "product_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "available_qty", nullable = false)
    @Builder.Default
    private Integer availableQty = 0;

    @Column(name = "reserved_qty", nullable = false)
    @Builder.Default
    private Integer reservedQty = 0;

    @Column(name = "fulfilled_qty", nullable = false)
    @Builder.Default
    private Integer fulfilledQty = 0;

    @Version
    private Long version;
}
