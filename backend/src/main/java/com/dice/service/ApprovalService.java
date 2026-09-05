package com.dice.service;

import com.dice.domain.Approval;
import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Deal;
import com.dice.domain.Evaluation;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.engine.approval.LineSnapshot;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.ApprovalSnapshotRepository;
import com.dice.repository.DealRepository;
import com.dice.repository.EvaluationRepository;
import com.dice.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Handles the approval queue: who sees what, and what happens when they decide.
 *
 * <p>Authority is checked here rather than by annotations alone, because the
 * required role is data on the {@link Approval} row, not a compile-time constant.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final ApprovalSnapshotRepository approvalSnapshotRepository;
    private final EvaluationRepository evaluationRepository;
    private final DealRepository dealRepository;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<Approval> pendingFor(Role role) {
        // ADMIN sees the whole queue, not just requests addressed to ADMIN.
        if (role == Role.ADMIN) {
            return approvalRepository.findByStatus(ApprovalStatus.PENDING);
        }
        return approvalRepository.findByRequiredRoleAndStatus(role.name(), ApprovalStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<Approval> forDeal(UUID dealId) {
        return approvalRepository.findByDealIdOrderByRequestedAtDesc(dealId);
    }

    @Transactional(readOnly = true)
    public Approval require(UUID approvalId) {
        return approvalRepository.findById(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("No approval with id " + approvalId));
    }

    public Approval approve(UUID approvalId, Role actorRole, String actor, String comment) {
        return decide(approvalId, actorRole, actor, comment, ApprovalStatus.APPROVED);
    }

    public Approval reject(UUID approvalId, Role actorRole, String actor, String comment) {
        return decide(approvalId, actorRole, actor, comment, ApprovalStatus.REJECTED);
    }

    /** Hands a request up to ADMIN when the current approver won't own it. */
    public Approval escalate(UUID approvalId, String actor, String comment) {
        Approval approval = require(approvalId);
        assertPending(approval);

        approval.setRequiredRole(Role.ADMIN.name());
        approval.setStatus(ApprovalStatus.PENDING);
        approval.setReason(append(approval.getReason(), "Escalated by %s: %s".formatted(actor, comment)));
        // Escalation resets the clock; the new approver gets a full window.
        approval.setSlaDueAt(Instant.now().plus(java.time.Duration.ofHours(24)));

        return approvalRepository.save(approval);
    }

    private Approval decide(UUID approvalId,
                            Role actorRole,
                            String actor,
                            String comment,
                            ApprovalStatus outcome) {
        Approval approval = require(approvalId);
        assertPending(approval);

        Role required = Role.valueOf(approval.getRequiredRole());
        if (!actorRole.canApproveFor(required)) {
            throw new SecurityException(
                    "%s cannot action an approval addressed to %s".formatted(actorRole, required));
        }

        approval.setStatus(outcome);
        approval.setDecidedBy(actor);
        approval.setDecidedAt(Instant.now());
        approval.setReason(append(approval.getReason(),
                "%s by %s: %s".formatted(outcome, actor, comment == null ? "" : comment)));
        Approval saved = approvalRepository.save(approval);

        advanceDeal(approval.getDeal(), outcome, required);

        eventPublisher.publish(
                outcome == ApprovalStatus.APPROVED
                        ? DealEvent.Type.APPROVAL_GRANTED
                        : DealEvent.Type.APPROVAL_REJECTED,
                approval.getDeal().getId(), actor,
                Map.of("approvalId", approvalId, "role", required.name()));

        return saved;
    }

    /**
     * A rejection stops the deal outright. An approval only advances it once
     * every outstanding request is cleared — a deal can need several. Clearing
     * the last one is also what captures the {@link ApprovalSnapshot} that
     * {@code DealService.evaluate} later compares against.
     */
    private void advanceDeal(Deal deal, ApprovalStatus outcome, Role decidingRole) {
        if (outcome == ApprovalStatus.REJECTED) {
            deal.setStatus(DealStatus.REJECTED);
            dealRepository.save(deal);
            return;
        }

        boolean stillWaiting = approvalRepository
                .existsByDealIdAndStatus(deal.getId(), ApprovalStatus.PENDING);
        if (!stillWaiting) {
            deal.setStatus(DealStatus.APPROVED);
            dealRepository.save(deal);
            captureApprovalSnapshot(deal, decidingRole);
            log.info("Deal {} fully approved; approval snapshot captured", deal.getDealNumber());
        }
    }

    /**
     * Freezes the approval-sensitive state of {@code deal} right now, for
     * {@code MaterialChangeDetector} to compare future evaluations against.
     *
     * <p>Any snapshot still active from a prior approval cycle is superseded
     * first — the partial unique index on {@code approval_snapshots} would
     * reject a second active row for the same deal otherwise, and logically
     * there can only be one "current" approved state at a time.
     */
    private void captureApprovalSnapshot(Deal deal, Role approvedByRole) {
        approvalSnapshotRepository.findByDealIdAndSupersededFalse(deal.getId())
                .ifPresent(previous -> {
                    previous.supersede("Superseded by a new approval cycle on the same deal");
                    approvalSnapshotRepository.save(previous);
                });

        Evaluation latestEvaluation = evaluationRepository
                .findFirstByDealIdOrderByCreatedAtDesc(deal.getId())
                .orElse(null);

        approvalSnapshotRepository.save(ApprovalSnapshot.builder()
                .deal(deal)
                .evaluation(latestEvaluation)
                .approvedByRole(approvedByRole.name())
                .subtotal(deal.getSubtotal())
                .discountAmount(deal.getDiscountAmount())
                .totalAmount(deal.getTotalAmount())
                .marginPercent(deal.getMarginPercent())
                .riskScore(deal.getRiskScore())
                .riskLevel(deal.getRiskLevel())
                .customerPaymentTermsDays(deal.getCustomer().getPaymentTermsDays())
                .lineSnapshot(toJson(LineSnapshot.of(deal.getLines())))
                .build());
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException e) {
            log.warn("Could not serialise approval snapshot lines: {}", e.getMessage());
            return "[]";
        }
    }

    private void assertPending(Approval approval) {
        if (approval.getStatus().isTerminal()) {
            throw new IllegalStateException(
                    "Approval %s is already %s".formatted(approval.getId(), approval.getStatus()));
        }
    }

    private String append(String existing, String line) {
        return existing == null || existing.isBlank() ? line : existing + "\n" + line;
    }
}
