package com.dice.service;

import com.dice.config.DiceProperties;
import com.dice.domain.AnomalyAlert;
import com.dice.domain.Deal;
import com.dice.domain.Evaluation;
import com.dice.engine.anomaly.DiscountAnomalyEngine;
import com.dice.repository.AnomalyAlertRepository;
import com.dice.repository.EvaluationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Rule-based discount anomaly detection using the deal's own evaluation
 * history as the baseline — no separate historical-aggregation store, no ML.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DiscountAnomalyService {

    public static final String METRIC_DISCOUNT_PERCENT = "DISCOUNT_PERCENT";

    private final EvaluationRepository evaluationRepository;
    private final AnomalyAlertRepository anomalyAlertRepository;
    private final DiceProperties properties;

    /**
     * Compares the deal's current discount against the average of its prior
     * evaluations. Persists (or leaves open) an alert when anomalous, and
     * resolves any previously-open alert when the deal is no longer anomalous.
     */
    public Optional<AnomalyAlert> evaluate(Deal deal) {
        BigDecimal current = deal.effectiveDiscountPercent();
        BigDecimal baseline = historicalAverageDiscount(deal.getId());

        double threshold = properties.anomaly() == null ? 1.5 : properties.anomaly().ratioThreshold();
        Optional<DiscountAnomalyEngine.Result> result =
                DiscountAnomalyEngine.evaluate(baseline, current, threshold);

        Optional<AnomalyAlert> open = anomalyAlertRepository
                .findByDealIdAndMetricAndResolvedFalse(deal.getId(), METRIC_DISCOUNT_PERCENT);

        if (result.isEmpty()) {
            open.ifPresent(alert -> {
                alert.setResolved(true);
                anomalyAlertRepository.save(alert);
            });
            return Optional.empty();
        }

        // Same unchanged anomaly state — do not raise a second alert.
        if (open.isPresent() && open.get().getRatio().compareTo(result.get().ratio()) == 0) {
            return open;
        }

        open.ifPresent(alert -> {
            alert.setResolved(true);
            anomalyAlertRepository.save(alert);
        });

        AnomalyAlert alert = AnomalyAlert.builder()
                .deal(deal)
                .metric(METRIC_DISCOUNT_PERCENT)
                .baseline(result.get().baseline())
                .currentValue(result.get().currentValue())
                .ratio(result.get().ratio())
                .severity(result.get().severity())
                .reason(result.get().reason())
                .build();

        return Optional.of(anomalyAlertRepository.save(alert));
    }

    @Transactional(readOnly = true)
    public List<AnomalyAlert> history(UUID dealId) {
        return anomalyAlertRepository.findByDealIdOrderByCreatedAtDesc(dealId);
    }

    /** Average discount percent across the deal's prior evaluations; zero if there is no history. */
    private BigDecimal historicalAverageDiscount(UUID dealId) {
        List<Evaluation> history = evaluationRepository.findByDealIdOrderByCreatedAtDesc(dealId);
        List<BigDecimal> discounts = history.stream()
                .map(Evaluation::getDiscountPercent)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (discounts.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal sum = discounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(discounts.size()), 6, RoundingMode.HALF_UP);
    }
}
