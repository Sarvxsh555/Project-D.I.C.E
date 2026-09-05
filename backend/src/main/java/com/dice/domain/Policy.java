package com.dice.domain;

import com.dice.domain.enums.CustomerSegment;
import com.dice.domain.enums.PolicySeverity;
import com.dice.domain.enums.PolicyType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A configurable commercial rule. Policies are data, not code — admins add rows
 * rather than shipping a release.
 *
 * <p>Scoping is "most specific wins": a policy with a matching {@link #segment},
 * {@link #customerTier} and {@link #productCategory} beats one matching fewer
 * of them, which beats a global one. {@link #priority} breaks remaining ties
 * (lower runs first).
 */
@Entity
@Table(name = "policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Policy {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PolicyType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private PolicySeverity severity = PolicySeverity.APPROVAL_REQUIRED;

    /** Null means "applies to every segment". */
    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private CustomerSegment segment;

    /** Free-form loyalty tier match against {@link Customer#getTier()}; null means "applies to every tier". */
    @Column(name = "customer_tier", length = 32)
    private String customerTier;

    /** Null means "applies to every category". */
    @Column(name = "product_category", length = 64)
    private String productCategory;

    /**
     * The number the rule compares against. Its meaning depends on {@link #type}
     * — a percentage for DISCOUNT_LIMIT and MARGIN_FLOOR, an absolute amount for
     * CREDIT_LIMIT and APPROVAL_THRESHOLD.
     */
    @Column(name = "threshold_value", nullable = false, precision = 18, scale = 4)
    private BigDecimal thresholdValue;

    /** Role that can clear a violation, e.g. {@code SALES_MANAGER}. */
    @Column(name = "required_role", length = 64)
    private String requiredRole;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** How specific this policy's scope is; higher wins. */
    public int specificity() {
        int score = 0;
        if (segment != null) {
            score += 2;
        }
        if (customerTier != null) {
            score += 2;
        }
        if (productCategory != null) {
            score += 1;
        }
        return score;
    }
}
