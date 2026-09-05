package com.dice.domain;

import com.dice.domain.enums.CustomerSegment;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * A named set of per-product prices, optionally scoped to a customer tier or
 * segment. {@link com.dice.service.PriceResolutionService} picks the most
 * specific list that applies to a given customer.
 */
@Entity
@Table(name = "price_lists")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceList {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    /** Null means this list is not segment-restricted. */
    @Enumerated(EnumType.STRING)
    @Column(name = "customer_segment", length = 32)
    private CustomerSegment customerSegment;

    /** Free-form tier match against {@link Customer#getTier()}; null means unrestricted. */
    @Column(name = "customer_tier", length = 32)
    private String customerTier;

    /** Lower wins when more than one list matches at the same specificity. */
    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** A list with neither tier nor segment set applies to every customer. */
    public boolean isDefault() {
        return customerTier == null && customerSegment == null;
    }
}
