package com.dice.controller;

import com.dice.domain.AuditEvent;
import com.dice.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only audit trail. Only managers, finance, and admins may view the full
 * history — reps can see their own deals' status but not the internal audit log.
 *
 * <p>The audit record is authoritative: it was written by the backend at the
 * time of the operation, using the authenticated principal. It is never editable.
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditEventRepository auditEventRepository;

    /** Most recent 50 events across all entities. */
    @GetMapping
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public List<AuditView> recent() {
        return auditEventRepository.findTop50ByOrderByOccurredAtDesc()
                .stream().map(AuditView::from).toList();
    }

    /** Full audit trail for a specific deal (by deal UUID). */
    @GetMapping("/deal/{dealId}")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public List<AuditView> forDeal(@PathVariable UUID dealId) {
        return auditEventRepository
                .findByAggregateTypeAndAggregateIdOrderByOccurredAtDesc("DEAL", dealId)
                .stream().map(AuditView::from).toList();
    }

    /** Full audit trail for a specific approval. */
    @GetMapping("/approval/{approvalId}")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public List<AuditView> forApproval(@PathVariable UUID approvalId) {
        return auditEventRepository
                .findByAggregateTypeAndAggregateIdOrderByOccurredAtDesc("APPROVAL", approvalId)
                .stream().map(AuditView::from).toList();
    }

    // ------------------------------------------------------------------
    // Wire formats
    // ------------------------------------------------------------------

    public record AuditView(
            UUID id,
            String entityType,
            UUID entityId,
            String action,
            String actor,
            String oldValue,
            String newValue,
            String reason,
            Instant occurredAt) {

        static AuditView from(AuditEvent e) {
            return new AuditView(
                    e.getId(),
                    e.getAggregateType(),
                    e.getAggregateId(),
                    e.getEventType(),
                    e.getActor(),
                    e.getOldValue(),
                    e.getNewValue(),
                    e.getReason(),
                    e.getOccurredAt());
        }
    }
}
