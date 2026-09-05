package com.dice.controller;

import com.dice.domain.Approval;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.security.Role;
import com.dice.service.ApprovalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The approver's queue and the actions available on it. */
@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    /** Everything waiting on the caller's role. */
    @GetMapping("/pending")
    public List<ApprovalView> pending(Authentication authentication) {
        return approvalService.pendingFor(highestRoleOf(authentication)).stream()
                .map(ApprovalView::from)
                .toList();
    }

    @GetMapping("/deal/{dealId}")
    public List<ApprovalView> forDeal(@PathVariable UUID dealId) {
        return approvalService.forDeal(dealId).stream().map(ApprovalView::from).toList();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public ApprovalView approve(@PathVariable UUID id,
                                @Valid @RequestBody ReasonRequest request,
                                Authentication authentication) {
        return ApprovalView.from(approvalService.approve(id,
                highestRoleOf(authentication),
                DealController.actorOf(authentication),
                request.reason()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public ApprovalView reject(@PathVariable UUID id,
                               @Valid @RequestBody ReasonRequest request,
                               Authentication authentication) {
        return ApprovalView.from(approvalService.reject(id,
                highestRoleOf(authentication),
                DealController.actorOf(authentication),
                request.reason()));
    }

    /** Sends the quotation back to the rep for revision instead of clearing or refusing it. */
    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public ApprovalView returnForRevision(@PathVariable UUID id,
                                         @Valid @RequestBody ReasonRequest request,
                                         Authentication authentication) {
        return ApprovalView.from(approvalService.returnForRevision(id,
                highestRoleOf(authentication),
                DealController.actorOf(authentication),
                request.reason()));
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAnyRole('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
    public ApprovalView escalate(@PathVariable UUID id,
                                 @RequestBody(required = false) DecisionRequest request,
                                 Authentication authentication) {
        return ApprovalView.from(approvalService.escalate(id,
                DealController.actorOf(authentication),
                request == null ? null : request.comment()));
    }

    /**
     * Users hold exactly one role in the demo store, but the token format allows
     * several — take the most authoritative so an admin isn't limited by a
     * lesser role that happens to sort first.
     */
    private Role highestRoleOf(Authentication authentication) {
        if (authentication == null) {
            return Role.SALES_REP;
        }
        return authentication.getAuthorities().stream()
                .map(granted -> Role.fromAuthority(granted.getAuthority()))
                .max(java.util.Comparator.naturalOrder())
                .orElse(Role.SALES_REP);
    }

    /** Escalation stays free-text/optional — a different, pre-existing concern from the reasoned actions above. */
    public record DecisionRequest(String comment) {
    }

    /** APPROVE/REJECT/RETURN must always say why; the backend enforces that, not the frontend. */
    public record ReasonRequest(@NotBlank String reason) {
    }

    public record ApprovalView(
            UUID id, UUID dealId, String dealNumber, String policyCode, String requiredRole,
            ApprovalLevel approvalLevel, ApprovalStatus status, String requestedBy, String decidedBy,
            String reason, Instant requestedAt, Instant slaDueAt, Instant decidedAt, boolean overdue) {

        static ApprovalView from(Approval a) {
            return new ApprovalView(a.getId(), a.getDeal().getId(), a.getDeal().getDealNumber(),
                    a.getPolicyCode(), a.getRequiredRole(), a.getApprovalLevel(), a.getStatus(),
                    a.getRequestedBy(), a.getDecidedBy(), a.getReason(), a.getRequestedAt(),
                    a.getSlaDueAt(), a.getDecidedAt(), a.isOverdue());
        }
    }
}
