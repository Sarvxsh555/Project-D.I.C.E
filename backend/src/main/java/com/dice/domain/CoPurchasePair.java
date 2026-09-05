package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * A directional co-purchase pairing.
 *
 * <p>{@code productSku} is the "trigger" — a product already on the deal.
 * {@code pairedSku} is the recommendation. {@code weight} drives the base
 * ranking score; {@code promotionLabel} activates a +50% score bonus in the
 * {@link com.dice.service.CoPurchaseRecommendationService}.
 */
@Entity
@Table(name = "co_purchase_pairs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_sku", "paired_sku"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoPurchasePair {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "product_sku", nullable = false, length = 64)
    private String productSku;

    @Column(name = "paired_sku", nullable = false, length = 64)
    private String pairedSku;

    /** Base ranking weight. Higher = more strongly recommended. */
    @Column(nullable = false)
    @Builder.Default
    private Integer weight = 1;

    /** Optional promotion label. When non-null, the score receives a +50% bonus. */
    @Column(name = "promotion_label", length = 128)
    private String promotionLabel;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
