package com.dice.service;

import com.dice.domain.AnomalyAlert;
import com.dice.domain.Approval;
import com.dice.domain.AuditEvent;
import com.dice.domain.Deal;
import com.dice.domain.NegotiationVersion;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.engine.decision.DecisionResolver;
import com.dice.engine.health.DealHealthEngine;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.risk.RiskEngine;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.AuditEventRepository;
import com.dice.repository.NegotiationRepository;
import com.dice.repository.NegotiationVersionRepository;
import com.dice.repository.PolicyRepository;
import com.dice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Assembles the full commit-22 {@link DealHealthEngine.HealthSignals} from
 * existing data — audit history, approvals, negotiations, fulfillment and the
 * commit-23 anomaly service — and runs the engine. This is the integration
 * point (flow 4 in the master spec); {@code DecisionResolver}'s own call keeps
 * using the plain margin/risk/policy score so its existing behaviour and
 * tests are untouched.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DealHealthService {

    private final DealService dealService;
    private final DecisionResolver decisionResolver;
    private final DealHealthEngine dealHealthEngine;
    private final DiscountAnomalyService discountAnomalyService;
    private final PolicyRepository policyRepository;
    private final ProductRepository productRepository;
    private final ApprovalRepository approvalRepository;
    private final AuditEventRepository auditEventRepository;
    private final NegotiationRepository negotiationRepository;
    private final NegotiationVersionRepository negotiationVersionRepository;

    public DealHealthEngine.HealthScore evaluate(UUID dealId) {
        Deal deal = dealService.require(dealId);

        var context = DecisionResolver.Context.of(
                policyRepository.findByActiveTrueOrderByPriorityAsc(),
                productRepository.findByActiveTrue());
        DecisionResolver.Resolution resolution = decisionResolver.resolve(deal, context);

        DealHealthEngine.HealthSignals signals = new DealHealthEngine.HealthSignals(
                inactivityDays(deal),
                approvalDelayHours(deal),
                anomalyDetected(deal).isPresent(),
                anomalyDetected(deal).map(AnomalyAlert::getReason).orElse(null),
                deliverySlippageDays(deal),
                negotiationCycles(deal));

        return dealHealthEngine.score(deal, resolution.margin(), resolution.risk(),
                resolution.policies(), signals);
    }

    private int inactivityDays(Deal deal) {
        List<AuditEvent> events = auditEventRepository.findByAggregateIdOrderByOccurredAtDesc(deal.getId());
        Instant lastActivity = events.isEmpty() ? deal.getCreatedAt() : events.get(0).getOccurredAt();
        if (lastActivity == null) {
            return 0;
        }
        return (int) Duration.between(lastActivity, Instant.now()).toDays();
    }

    private int approvalDelayHours(Deal deal) {
        return approvalRepository.findByDealIdOrderByRequestedAtDesc(deal.getId()).stream()
                .filter(a -> a.getStatus() == ApprovalStatus.PENDING)
                .mapToInt(a -> (int) Duration.between(a.getRequestedAt(), Instant.now()).toHours())
                .max()
                .orElse(0);
    }

    private Optional<AnomalyAlert> anomalyDetected(Deal deal) {
        return discountAnomalyService.history(deal.getId()).stream()
                .filter(alert -> !alert.isResolved())
                .findFirst();
    }

    /** Days past the requested delivery date for a deal still in the fulfillment pipeline. */
    private int deliverySlippageDays(Deal deal) {
        if (deal.getRequestedDeliveryDate() == null) {
            return 0;
        }
        boolean stillInFlight = deal.getStatus() == DealStatus.CONFIRMED
                || deal.getStatus() == DealStatus.FULFILLING;
        if (!stillInFlight) {
            return 0;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(deal.getRequestedDeliveryDate(), LocalDate.now());
        return (int) Math.max(0, days);
    }

    private int negotiationCycles(Deal deal) {
        return negotiationRepository.findByDealId(deal.getId())
                .map(negotiation -> negotiationVersionRepository
                        .findByNegotiationIdOrderByVersionNumberDesc(negotiation.getId()).size())
                .orElse(0);
    }
}
