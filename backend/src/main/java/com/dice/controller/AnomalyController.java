package com.dice.controller;

import com.dice.domain.AnomalyAlert;
import com.dice.domain.enums.AnomalySeverity;
import com.dice.service.DiscountAnomalyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AnomalyController {

    private final DiscountAnomalyService discountAnomalyService;

    @GetMapping("/api/deals/{dealId}/anomalies")
    public List<AnomalyAlertView> forDeal(@PathVariable UUID dealId) {
        return discountAnomalyService.history(dealId).stream().map(AnomalyAlertView::from).toList();
    }

    public record AnomalyAlertView(UUID id, String metric, BigDecimal baseline, BigDecimal currentValue,
                                   BigDecimal ratio, AnomalySeverity severity, String reason,
                                   boolean resolved, Instant createdAt) {
        static AnomalyAlertView from(AnomalyAlert alert) {
            return new AnomalyAlertView(alert.getId(), alert.getMetric(), alert.getBaseline(),
                    alert.getCurrentValue(), alert.getRatio(), alert.getSeverity(), alert.getReason(),
                    alert.isResolved(), alert.getCreatedAt());
        }
    }
}
