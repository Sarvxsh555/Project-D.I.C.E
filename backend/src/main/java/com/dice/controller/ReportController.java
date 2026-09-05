package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final DealRepository dealRepository;

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<Deal> deals = dealRepository.findAll();
        BigDecimal totalPipeline = deals.stream()
                .map(Deal::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double avgMargin = deals.stream()
                .map(Deal::getMarginPercent)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(65.0);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalPipelineValue", totalPipeline);
        res.put("activeDealsCount", deals.size());
        res.put("averageMarginPercent", Math.round(avgMargin * 10.0) / 10.0);
        res.put("winRatePercent", 74.5);
        res.put("riskDistribution", Map.of("LOW", 3, "MEDIUM", 1, "HIGH", 1));
        return res;
    }

    @GetMapping("/deals")
    public Map<String, Object> pipelineMetrics() {
        List<Deal> deals = dealRepository.findAll();
        BigDecimal totalPipeline = deals.stream()
                .map(Deal::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double avgMargin = deals.stream()
                .map(Deal::getMarginPercent)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(65.0);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalPipelineValue", totalPipeline);
        res.put("weightedValue", totalPipeline.multiply(BigDecimal.valueOf(0.75)));
        res.put("averageMarginPercent", Math.round(avgMargin * 10.0) / 10.0);
        res.put("conversionRatePercent", 72.8);
        return res;
    }
}
