package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A persisted warehouse-allocation outcome for a confirmed {@link Deal}.
 *
 * <p>Distinct from {@code FulfillmentEngine.FulfillmentPlan} (a preview-only
 * record used by the legacy single-warehouse-per-line planner) — this is the
 * durable record of what was actually reserved, produced by the allocation
 * engine that can split a line across several warehouses.
 */
@Entity
@Table(name = "fulfillment_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FulfillmentPlan {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @Column(name = "created_by", nullable = false, length = 128)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FulfillmentAllocationLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void addLine(FulfillmentAllocationLine line) {
        lines.add(line);
        line.setPlan(this);
    }
}
