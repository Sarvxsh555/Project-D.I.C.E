package com.dice.controller;

import com.dice.domain.enums.HealthStatus;
import com.dice.engine.health.DealHealthEngine;
import com.dice.service.DealHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** The full commit-22 deal health score — inactivity, approval delay, anomaly, delivery, negotiation cycles. */
@RestController
@RequiredArgsConstructor
public class DealHealthController {

    private final DealHealthService dealHealthService;

    @GetMapping("/api/deals/{id}/health")
    public HealthView health(@PathVariable UUID id) {
        return HealthView.from(dealHealthService.evaluate(id));
    }

    public record HealthView(int score, DealHealthEngine.Band band, HealthStatus status, List<String> reasons) {
        static HealthView from(DealHealthEngine.HealthScore health) {
            return new HealthView(health.score(), health.band(), health.status(), health.reasons());
        }
    }
}
