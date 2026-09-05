package com.dice.controller;

import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.RiskLevel;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.AuditEventRepository;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregates for the landing page. Read-only and deliberately denormalised into
 * a single response so the dashboard is one request, not eight.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardController {

    /** Deals below this health score are surfaced as needing attention. */
    private static final int AT_RISK_THRESHOLD = 60;

    private final DealRepository dealRepository;
    private final ApprovalRepository approvalRepository;
    private final AuditEventRepository auditEventRepository;

    @GetMapping("/summary")
    public Summary summary() {
        Map<String, Long> byStatus = new java.util.LinkedHashMap<>();
        for (DealStatus status : DealStatus.values()) {
            long count = dealRepository.countByStatus(status);
            if (count > 0) {
                byStatus.put(status.name(), count);
            }
        }

        var pending = approvalRepository.findByStatus(ApprovalStatus.PENDING);

        return new Summary(
                dealRepository.count(),
                dealRepository.sumOpenPipelineValue(),
                byStatus,
                pending.size(),
                pending.stream().filter(a -> a.isOverdue()).count(),
                dealRepository.findAll().stream()
                        .filter(d -> d.getHealthScore() != null && d.getHealthScore() < AT_RISK_THRESHOLD)
                        .count());
    }

    /** The approval queue, oldest first — what to work on next. */
    @GetMapping("/approvals/queue")
    public List<QueueItem> approvalQueue() {
        return approvalRepository.findByStatus(ApprovalStatus.PENDING).stream()
                .sorted(java.util.Comparator.comparing(
                        com.dice.domain.Approval::getRequestedAt))
                .map(a -> new QueueItem(a.getId(), a.getDeal().getDealNumber(),
                        a.getRequiredRole(), a.getRequestedAt(), a.getSlaDueAt(), a.isOverdue()))
                .toList();
    }

    /** Recent activity across every deal. */
    @GetMapping("/activity")
    public List<ActivityItem> activity() {
        return auditEventRepository.findTop50ByOrderByOccurredAtDesc().stream()
                .map(e -> new ActivityItem(e.getId(), e.getAggregateId(), e.getEventType(),
                        e.getActor(), e.getOccurredAt()))
                .toList();
    }

    /** Same population {@link #summary}'s atRiskDeals count is drawn from, as a
     *  list — deals whose health score has dropped below the attention threshold. */
    @GetMapping("/at-risk")
    public List<AtRiskDeal> atRiskDeals() {
        return dealRepository.findAll().stream()
                .filter(d -> d.getHealthScore() != null && d.getHealthScore() < AT_RISK_THRESHOLD)
                .sorted(java.util.Comparator.comparing(com.dice.domain.Deal::getHealthScore))
                .map(d -> new AtRiskDeal(d.getId(), d.getDealNumber(), d.getCustomer().getName(),
                        d.getRiskScore(), d.getRiskLevel(), d.getHealthScore()))
                .toList();
    }

    public record Summary(
            long totalDeals,
            BigDecimal openPipelineValue,
            Map<String, Long> dealsByStatus,
            int pendingApprovals,
            long overdueApprovals,
            long atRiskDeals) {
    }

    public record QueueItem(UUID approvalId, String dealNumber, String requiredRole,
                            Instant requestedAt, Instant slaDueAt, boolean overdue) {
    }

    public record ActivityItem(UUID id, UUID dealId, String eventType, String actor,
                               Instant occurredAt) {
    }

    public record AtRiskDeal(UUID dealId, String dealNumber, String customerName,
                             Integer riskScore, RiskLevel riskLevel, Integer healthScore) {
    }
}
