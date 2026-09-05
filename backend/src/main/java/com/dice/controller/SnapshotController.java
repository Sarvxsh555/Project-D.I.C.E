package com.dice.controller;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.enums.RiskLevel;
import com.dice.engine.approval.LineSnapshot;
import com.dice.repository.ApprovalSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only view of approval snapshots for a deal — the frozen commercial
 * state at the moment each approval cycle cleared, and (via {@code superseded})
 * which of those states a later material change invalidated.
 *
 * <p>Snapshots are immutable historical records — there are no mutating
 * endpoints here. The authoritative approved commercial state must never be
 * editable after the fact.
 */
@RestController
@RequestMapping("/api/deals/{dealId}/snapshots")
@RequiredArgsConstructor
@Slf4j
public class SnapshotController {

    private final ApprovalSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    /** All snapshots for a deal, newest first. */
    @GetMapping
    public List<SnapshotView> forDeal(@PathVariable UUID dealId) {
        return snapshotRepository.findByDealIdOrderByCapturedAtDesc(dealId)
                .stream()
                .map(this::toView)
                .toList();
    }

    @GetMapping("/{id}")
    public SnapshotView get(@PathVariable UUID dealId, @PathVariable UUID id) {
        ApprovalSnapshot snap = snapshotRepository.findById(id)
                .filter(s -> s.getDeal().getId().equals(dealId))
                .orElseThrow(() -> new IllegalArgumentException("No snapshot " + id + " for deal " + dealId));
        return toView(snap);
    }

    private SnapshotView toView(ApprovalSnapshot s) {
        return new SnapshotView(
                s.getId(),
                s.getDeal().getId(),
                s.getApprovedByRole(),
                s.getSubtotal(),
                s.getDiscountAmount(),
                s.getTotalAmount(),
                s.getMarginPercent(),
                s.getRiskScore(),
                s.getRiskLevel(),
                s.getCustomerPaymentTermsDays(),
                s.getCapturedAt(),
                s.isSuperseded(),
                s.getSupersededAt(),
                s.getSupersededReason(),
                parseLines(s));
    }

    private List<LineSnapshot> parseLines(ApprovalSnapshot snapshot) {
        try {
            return List.of(objectMapper.readValue(snapshot.getLineSnapshot(), LineSnapshot[].class));
        } catch (JsonProcessingException e) {
            log.warn("Could not parse line snapshot for approval snapshot {}: {}",
                    snapshot.getId(), e.getMessage());
            return List.of();
        }
    }

    // ------------------------------------------------------------------
    // Wire formats
    // ------------------------------------------------------------------

    public record SnapshotView(
            UUID id,
            UUID dealId,
            String approvedByRole,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            BigDecimal marginPercent,
            Integer riskScore,
            RiskLevel riskLevel,
            Integer customerPaymentTermsDays,
            Instant capturedAt,
            boolean superseded,
            Instant supersededAt,
            String supersededReason,
            List<LineSnapshot> lines) {
    }
}
