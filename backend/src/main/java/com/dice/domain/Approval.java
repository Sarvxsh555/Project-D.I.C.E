package com.dice.domain;

import com.dice.domain.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** A sign-off request raised because a policy needed a role-holder's decision. */
@Entity
@Table(name = "approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Approval {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    /** The evaluation that raised this request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id")
    private Evaluation evaluation;

    /** Code of the policy that triggered it; null for manual escalations. */
    @Column(name = "policy_code", length = 64)
    private String policyCode;

    @Column(name = "required_role", nullable = false, length = 64)
    private String requiredRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "requested_by", length = 128)
    private String requestedBy;

    @Column(name = "decided_by", length = 128)
    private String decidedBy;

    /** Why it was needed, and later, why it was granted or refused. */
    @Column(columnDefinition = "text")
    private String reason;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    /** When this breaches SLA. Drives the "ageing approvals" dashboard tile. */
    @Column(name = "sla_due_at")
    private Instant slaDueAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @PrePersist
    void onCreate() {
        if (requestedAt == null) {
            requestedAt = Instant.now();
        }
    }

    public boolean isOverdue() {
        return status == ApprovalStatus.PENDING
                && slaDueAt != null
                && Instant.now().isAfter(slaDueAt);
    }
}
