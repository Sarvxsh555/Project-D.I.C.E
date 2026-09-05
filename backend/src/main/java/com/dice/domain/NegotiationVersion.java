package com.dice.domain;

import com.dice.domain.enums.NegotiationVersionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A frozen commercial proposal within a {@link Negotiation}. Created every
 * time a counter-offer is submitted; never overwritten — a later counter-offer
 * always creates a new row and flips this one to {@code SUPERSEDED}.
 */
@Entity
@Table(name = "negotiation_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationVersion {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "negotiation_id", nullable = false)
    private Negotiation negotiation;

    /** 1-based, strictly increasing per negotiation. */
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private NegotiationVersionStatus status;

    /** Blended discount at the moment this version was captured. */
    @Column(name = "discount_percent", nullable = false, precision = 7, scale = 4)
    private BigDecimal discountPercent;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    private BigDecimal marginPercent;

    /** Username or customer portal identity that proposed this version. */
    @Column(name = "created_by", nullable = false, length = 128)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<NegotiationVersionItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void addItem(NegotiationVersionItem item) {
        items.add(item);
        item.setVersion(this);
    }
}
