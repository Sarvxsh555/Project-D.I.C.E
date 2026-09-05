package com.dice.service;

import com.dice.domain.Approval;
import com.dice.domain.Deal;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.DealRepository;
import com.dice.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final DealRepository dealRepository;
    private final EventPublisher eventPublisher;

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

        advanceDeal(approval.getDeal(), outcome);

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
     * every outstanding request is cleared — a deal can need several.
     */
    private void advanceDeal(Deal deal, ApprovalStatus outcome) {
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
            log.info("Deal {} fully approved", deal.getDealNumber());
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
