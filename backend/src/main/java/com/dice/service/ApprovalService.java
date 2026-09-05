package com.dice.service;

import com.dice.domain.Approval;
import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Deal;
import com.dice.domain.Evaluation;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.QuotationDecision;
import com.dice.engine.approval.LineSnapshot;
import com.dice.engine.decision.DecisionResolver;
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

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

/**
 * Handles the approval queue: who sees what, and what happens when they decide.
 *
 * <p>Authority is checked here rather than by annotations alone, because the
 * required role is data on the {@link Approval} row, not a compile-time constant.
 *
 * <p>Two independent things share the {@link Approval} entity and this
 * service: the original per-policy-violation requests opened by
 * {@code DealService#openApprovals}/{@code openReapprovalRequest} (routed by
 * role, unordered, {@link Approval#getApprovalLevel()} null), and the
 * DealFlow360 sequential quotation chain added here (routed by
 * {@link ApprovalLevel}, strictly ordered: SALES_MANAGER then
 * FINANCE_OPERATIONS). {@link #decide} branches on which kind a row is;
 * neither branch changes the other's behaviour. Both paths write to the same
 * {@link ApprovalSnapshot} shape via {@link #captureApprovalSnapshot} — there
 * is one snapshot design, not two, even though two flows can produce one.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ApprovalService {

    /** How long an approver has before a sequential-chain request shows as overdue. */
    private static final Duration SEQUENTIAL_SLA = Duration.ofHours(8);

    private final ApprovalRepository approvalRepository;
    private final ApprovalSnapshotRepository approvalSnapshotRepository;
    private final EvaluationRepository evaluationRepository;
    private final DealRepository dealRepository;
    private final EventPublisher eventPublisher;
    private final AuditService auditService;
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

    public Approval approve(UUID approvalId, Role actorRole, String actor, String reason) {
        return decide(approvalId, actorRole, actor, reason, ApprovalStatus.APPROVED);
    }

    public Approval reject(UUID approvalId, Role actorRole, String actor, String reason) {
        return decide(approvalId, actorRole, actor, reason, ApprovalStatus.REJECTED);
    }

    /** Sends the quotation back to the rep instead of clearing or refusing it outright. */
    public Approval returnForRevision(UUID approvalId, Role actorRole, String actor, String reason) {
        return decide(approvalId, actorRole, actor, reason, ApprovalStatus.RETURNED);
    }

    /** Hands a request up to ADMIN when the current approver won't own it. */
    public Approval escalate(UUID approvalId, String actor, String comment) {
        Approval approval = require(approvalId);
        assertPending(approval);

        approval.setRequiredRole(Role.ADMIN.name());
        approval.setStatus(ApprovalStatus.PENDING);
        approval.setReason(append(approval.getReason(), "Escalated by %s: %s".formatted(actor, comment)));
        // Escalation resets the clock; the new approver gets a full window.
        approval.setSlaDueAt(Instant.now().plus(Duration.ofHours(24)));

        return approvalRepository.save(approval);
    }

    /**
     * @param reason required — every decided request must say why, both for the
     *               audit trail and because "approve"/"reject" with no
     *               explanation is exactly the kind of unexplainable decision
     *               this project exists to avoid.
     */
    private Approval decide(UUID approvalId,
                            Role actorRole,
                            String actor,
                            String reason,
                            ApprovalStatus outcome) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException(
                    "A reason is required to %s an approval".formatted(outcome.name().toLowerCase()));
        }

        Approval approval = require(approvalId);
        assertPending(approval);

        Deal deal = approval.getDeal();
        if (actor != null && deal.getOwnerUsername() != null
                && actor.equalsIgnoreCase(deal.getOwnerUsername())) {
            throw new SecurityException(
                    "%s owns deal %s and cannot decide its own approval".formatted(actor, deal.getDealNumber()));
        }

        if (approval.getApprovalLevel() != null) {
            authorizeLevel(actorRole, approval.getApprovalLevel());
            if (outcome == ApprovalStatus.APPROVED) {
                assertPriorLevelsCleared(approval);
            }
        } else {
            Role required = Role.valueOf(approval.getRequiredRole());
            if (!actorRole.canApproveFor(required)) {
                throw new SecurityException(
                        "%s cannot action an approval addressed to %s".formatted(actorRole, required));
            }
        }

        approval.setStatus(outcome);
        approval.setDecidedBy(actor);
        approval.setDecidedAt(Instant.now());
        approval.setReason(append(approval.getReason(), "%s by %s: %s".formatted(outcome, actor, reason)));
        Approval saved = approvalRepository.save(approval);

        // Audit — actor comes from the authenticated backend principal, never the frontend.
        auditService.record(
                AuditService.APPROVAL,
                approval.getId(),
                auditActionFor(outcome),
                actor,
                ApprovalStatus.PENDING.name(),
                outcome.name(),
                reason);

        if (saved.getApprovalLevel() != null) {
            advanceDealForSequentialChain(saved, outcome);
        } else {
            advanceDealForPolicyViolations(deal, outcome, actorRole);
        }

        eventPublisher.publish(eventTypeFor(outcome), deal.getId(), actor,
                Map.of("approvalId", approvalId,
                        "requiredRole", approval.getRequiredRole(),
                        "reason", reason));

        return saved;
    }

    private String auditActionFor(ApprovalStatus outcome) {
        return switch (outcome) {
            case APPROVED -> AuditService.APPROVED;
            case REJECTED -> AuditService.REJECTED;
            case RETURNED -> AuditService.RETURNED;
            default -> outcome.name();
        };
    }

    private String eventTypeFor(ApprovalStatus outcome) {
        return switch (outcome) {
            case APPROVED -> DealEvent.Type.APPROVAL_GRANTED;
            case REJECTED -> DealEvent.Type.APPROVAL_REJECTED;
            case RETURNED -> DealEvent.Type.APPROVAL_RETURNED;
            default -> DealEvent.Type.APPROVAL_GRANTED;
        };
    }

    // ------------------------------------------------------------------
    // Original per-policy-violation flow — unchanged behaviour.
    // ------------------------------------------------------------------

    /**
     * A rejection stops the deal outright. An approval only advances it once
     * every outstanding request is cleared — a deal can need several. Clearing
     * the last one is also what captures the {@link ApprovalSnapshot} that
     * {@code DealService.evaluate} later compares against.
     */
    private void advanceDealForPolicyViolations(Deal deal, ApprovalStatus outcome, Role decidingRole) {
        if (outcome == ApprovalStatus.REJECTED) {
            deal.setStatus(DealStatus.REJECTED);
            dealRepository.save(deal);
            return;
        }
        if (outcome == ApprovalStatus.RETURNED) {
            deal.setStatus(DealStatus.RETURNED_FOR_REVISION);
            dealRepository.save(deal);
            return;
        }

        boolean stillWaiting = approvalRepository
                .existsByDealIdAndStatus(deal.getId(), ApprovalStatus.PENDING);
        if (!stillWaiting) {
            deal.setStatus(DealStatus.APPROVED);
            dealRepository.save(deal);
            captureApprovalSnapshot(deal, decidingRole.name());
            log.info("Deal {} fully approved; approval snapshot captured", deal.getDealNumber());
        }
    }

    /**
     * Freezes the approval-sensitive state of {@code deal} right now, for
     * {@code MaterialChangeDetector} to compare future evaluations against.
     * Shared by both approval flows — see class doc.
     *
     * <p>Any snapshot still active from a prior approval cycle is superseded
     * first — the partial unique index on {@code approval_snapshots} would
     * reject a second active row for the same deal otherwise, and logically
     * there can only be one "current" approved state at a time.
     *
     * @param approvedByRole the role (or {@link ApprovalLevel} name) whose
     *                       clearance finalised the deal — where a future
     *                       reapproval routes back to
     */
    private void captureApprovalSnapshot(Deal deal, String approvedByRole) {
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
                .approvedByRole(approvedByRole)
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

    // ------------------------------------------------------------------
    // DealFlow360 sequential quotation approval chain.
    // ------------------------------------------------------------------

    /**
     * Called from {@code DealService#evaluate} right after the existing
     * per-violation {@code openApprovals} — additive, not a replacement.
     * Opens (or reuses) the next pending step in the SALES_MANAGER →
     * FINANCE_OPERATIONS chain when the quotation decision demands it.
     */
    public Optional<Approval> ensureSequentialApproval(Deal deal,
                                                       Evaluation evaluation,
                                                       DecisionResolver.QuotationDecisionResult decision) {
        if (!decision.approvalRequired()) {
            return Optional.empty();
        }

        List<Approval> history = approvalRepository
                .findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(deal.getId());

        // A quotation that drifted back out of policy after already being fully
        // approved restarts the chain from the top rather than reusing stale sign-offs.
        ApprovalLevel target = decision.decision() == QuotationDecision.REAPPROVAL_REQUIRED
                ? ApprovalLevel.SALES_MANAGER
                : nextLevel(history);

        if (target == null) {
            return Optional.empty();
        }

        Optional<Approval> pending = history.stream()
                .filter(a -> a.getApprovalLevel() == target && a.getStatus() == ApprovalStatus.PENDING)
                .findFirst();
        if (pending.isPresent()) {
            return pending;
        }

        return Optional.of(openLevel(deal, evaluation, target, decision.reasons()));
    }

    /** The first level (in pipeline order) whose most recent decision isn't APPROVED. */
    private ApprovalLevel nextLevel(List<Approval> historyNewestFirst) {
        for (ApprovalLevel level : ApprovalLevel.values()) {
            Approval mostRecent = historyNewestFirst.stream()
                    .filter(a -> a.getApprovalLevel() == level)
                    .findFirst()
                    .orElse(null);
            if (mostRecent == null || mostRecent.getStatus() != ApprovalStatus.APPROVED) {
                return level;
            }
        }
        return null;
    }

    private Approval openLevel(Deal deal, Evaluation evaluation, ApprovalLevel level, List<String> reasons) {
        String reasonText = (reasons == null || reasons.isEmpty())
                ? "Quotation requires %s sign-off.".formatted(level)
                : "Quotation requires %s sign-off: %s".formatted(level, String.join("; ", reasons));

        Approval approval = approvalRepository.save(Approval.builder()
                .deal(deal)
                .evaluation(evaluation)
                .approvalLevel(level)
                .requiredRole(level.name())
                .status(ApprovalStatus.PENDING)
                .requestedBy("system")
                .reason(reasonText)
                .slaDueAt(Instant.now().plus(SEQUENTIAL_SLA))
                .build());

        eventPublisher.publish(DealEvent.Type.APPROVAL_REQUESTED, deal.getId(), "system",
                Map.of("approvalId", approval.getId(), "approvalLevel", level.name()));
        return approval;
    }

    /** Defence in depth: even if a later-level row exists, it cannot be granted out of order. */
    private void assertPriorLevelsCleared(Approval approval) {
        ApprovalLevel level = approval.getApprovalLevel();
        ApprovalLevel[] levels = ApprovalLevel.values();
        int index = java.util.Arrays.asList(levels).indexOf(level);
        for (int i = 0; i < index; i++) {
            boolean cleared = approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                    approval.getDeal().getId(), levels[i], ApprovalStatus.APPROVED);
            if (!cleared) {
                throw new IllegalStateException(
                        "%s must be approved before %s can be decided".formatted(levels[i], level));
            }
        }
    }

    /** Only ADMIN can act at every level; otherwise the actor's role must match the level exactly. */
    private void authorizeLevel(Role actorRole, ApprovalLevel level) {
        if (actorRole == Role.ADMIN) {
            return;
        }
        boolean authorized = switch (level) {
            case SALES_MANAGER -> actorRole == Role.SALES_MANAGER;
            case FINANCE_OPERATIONS -> actorRole == Role.FINANCE || actorRole == Role.OPERATIONS;
        };
        if (!authorized) {
            throw new SecurityException(
                    "%s cannot action a %s approval".formatted(actorRole, level));
        }
    }

    private void advanceDealForSequentialChain(Approval approval, ApprovalStatus outcome) {
        Deal deal = approval.getDeal();
        ApprovalLevel level = approval.getApprovalLevel();

        if (outcome == ApprovalStatus.REJECTED) {
            deal.setStatus(DealStatus.REJECTED);
            dealRepository.save(deal);
            return;
        }
        if (outcome == ApprovalStatus.RETURNED) {
            deal.setStatus(DealStatus.RETURNED_FOR_REVISION);
            dealRepository.save(deal);
            return;
        }

        // outcome == APPROVED
        ApprovalLevel[] levels = ApprovalLevel.values();
        boolean isLastLevel = level == levels[levels.length - 1];
        if (!isLastLevel) {
            ApprovalLevel next = levels[java.util.Arrays.asList(levels).indexOf(level) + 1];
            boolean alreadyOpen = approvalRepository
                    .existsByDealIdAndApprovalLevelAndStatus(deal.getId(), next, ApprovalStatus.PENDING);
            if (!alreadyOpen) {
                openLevel(deal, approval.getEvaluation(), next, List.of());
            }
            return;
        }

        deal.setStatus(DealStatus.APPROVED);
        dealRepository.save(deal);
        log.info("Deal {} fully cleared the sequential approval chain", deal.getDealNumber());
        captureApprovalSnapshot(deal, level.name());
    }

    // ------------------------------------------------------------------

    private void assertPending(Approval approval) {
        if (approval.getStatus().isTerminal()) {
            throw new IllegalStateException(
                    "Approval %s is already %s".formatted(approval.getId(), approval.getStatus()));
        }
    }

    private String append(String existing, String line) {
        return existing == null || existing.isBlank() ? line : existing + "\n" + line;
    }

    /**
     * Withdraws all pending sequential-chain approvals for a deal when a material
     * quotation change has voided the prior commercial state.
     *
     * <p>Called by {@code DealService} after it detects a material change against
     * the last approved snapshot (see {@code DealService.checkMaterialChange},
     * the real, verified comparison — not a re-derivation here). Audit events
     * are written for each withdrawn approval so the audit trail explains why
     * the chain was reset.
     *
     * @param deal   the deal whose sequential approvals should be invalidated
     * @param reason human-readable material-change reason for the audit trail
     */
    public void invalidatePriorApprovals(Deal deal, String reason) {
        List<Approval> pending = approvalRepository
                .findByDealIdAndApprovalLevelIsNotNullOrderByRequestedAtDesc(deal.getId())
                .stream()
                .filter(a -> a.getStatus() == ApprovalStatus.PENDING
                        || a.getStatus() == ApprovalStatus.ESCALATED)
                .toList();

        if (pending.isEmpty()) {
            return;
        }

        for (Approval approval : pending) {
            approval.setStatus(ApprovalStatus.WITHDRAWN);
            approval.setDecidedAt(Instant.now());
            approval.setDecidedBy("system");
            approval.setReason(
                    append(approval.getReason(), "Withdrawn — material quotation change: " + reason));
            approvalRepository.save(approval);

            auditService.record(
                    AuditService.APPROVAL,
                    approval.getId(),
                    AuditService.APPROVAL_INVALIDATED,
                    "system",
                    ApprovalStatus.PENDING.name(),
                    ApprovalStatus.WITHDRAWN.name(),
                    reason);
        }

        log.info("Invalidated {} pending approval(s) for deal {} due to material change",
                pending.size(), deal.getDealNumber());
    }
}
