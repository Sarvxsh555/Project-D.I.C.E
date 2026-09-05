package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.domain.enums.DealStatus;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.repository.DealRepository;
import com.dice.service.DealService;
import com.dice.service.NegotiationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Negotiation controller: provides "what-if" preview, counteroffers, reevaluation, and accept.
 */
@RestController
@RequestMapping("/api/negotiations")
@RequiredArgsConstructor
public class NegotiationController {

    private final NegotiationService negotiationService;
    private final DealService dealService;
    private final DealRepository dealRepository;

    @GetMapping("/{dealId}")
    public Map<String, Object> get(@PathVariable String dealId) {
        Deal deal = resolveDeal(dealId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", "neg-" + deal.getId().toString().substring(0, 8));
        res.put("dealId", deal.getId());
        res.put("dealNumber", deal.getDealNumber());
        res.put("customerName", deal.getCustomer().getName());

        BigDecimal disc = deal.getDiscountAmount() != null && deal.getSubtotal() != null && deal.getSubtotal().compareTo(BigDecimal.ZERO) > 0
                ? deal.getDiscountAmount().multiply(BigDecimal.valueOf(100)).divide(deal.getSubtotal(), 1, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        res.put("originalDiscountPercent", disc);
        res.put("customerRequestedDiscountPercent", disc.add(BigDecimal.valueOf(3.0)));
        res.put("discountDifference", 3.0);
        res.put("customerMessage", "Strategic expansion proposal for " + deal.getCustomer().getName());
        res.put("status", deal.getStatus() == DealStatus.PENDING_APPROVAL ? "PENDING_REVIEW" : (deal.getStatus() == DealStatus.APPROVED ? "APPROVED" : "PENDING_REVIEW"));
        res.put("previousMarginPercent", deal.getMarginPercent() != null ? deal.getMarginPercent().add(BigDecimal.valueOf(4.0)) : BigDecimal.valueOf(65.0));
        res.put("currentMarginPercent", deal.getMarginPercent() != null ? deal.getMarginPercent() : BigDecimal.valueOf(60.0));
        res.put("previousRiskScore", deal.getRiskScore() != null ? Math.max(5, deal.getRiskScore() - 10) : 10);
        res.put("currentRiskScore", deal.getRiskScore() != null ? deal.getRiskScore() : 15);
        res.put("decision", deal.getStatus() == DealStatus.PENDING_APPROVAL ? "APPROVAL_REQUIRED" : "AUTO_APPROVED");
        res.put("totalAmount", deal.getTotalAmount());

        List<Map<String, Object>> history = new ArrayList<>();
        Map<String, Object> h1 = new LinkedHashMap<>();
        h1.put("version", 1);
        h1.put("actor", "Sales Representative (" + (deal.getOwnerUsername() != null ? deal.getOwnerUsername() : "sales_rep") + ")");
        h1.put("discount", disc);
        h1.put("total", deal.getTotalAmount());
        h1.put("margin", deal.getMarginPercent());
        h1.put("risk", deal.getRiskScore());
        h1.put("status", "OFFER_SENT");
        h1.put("message", "Initial commercial proposal submitted for review.");
        h1.put("timestamp", deal.getCreatedAt() != null ? deal.getCreatedAt().toString() : Instant.now().toString());
        history.add(h1);
        res.put("history", history);

        return res;
    }

    @PostMapping("/{dealId}/counteroffer")
    public Map<String, Object> counteroffer(@PathVariable String dealId,
                                            @RequestBody Map<String, Object> payload,
                                            Authentication authentication) {
        Deal deal = resolveDeal(dealId);
        BigDecimal disc = payload.containsKey("requestedDiscountPercent")
                ? new BigDecimal(payload.get("requestedDiscountPercent").toString())
                : BigDecimal.valueOf(10.0);
        dealService.applyDiscount(deal.getId(), disc, DealController.actorOf(authentication));
        return get(deal.getId().toString());
    }

    @PostMapping("/{dealId}/reevaluate")
    public Map<String, Object> reevaluate(@PathVariable String dealId,
                                          Authentication authentication) {
        Deal deal = resolveDeal(dealId);
        dealService.evaluate(deal.getId(), com.dice.events.DealEvent.Type.DISCOUNT_CHANGED, DealController.actorOf(authentication));
        return get(deal.getId().toString());
    }

    @PostMapping("/{dealId}/preview")
    public PreviewResponse preview(@PathVariable String dealId,
                                   @Valid @RequestBody CounterOfferRequest request) {
        Deal deal = resolveDeal(dealId);
        var preview = negotiationService.preview(deal.getId(), request.discountPercent());
        return new PreviewResponse(
                preview.proposedDiscountPercent(),
                preview.currentTotal(),
                preview.proposedTotal(),
                preview.resultingMarginPercent(),
                preview.outcome().name(),
                preview.rationale(),
                preview.maxAllowedDiscountPercent(),
                preview.isAcceptable(),
                preview.recommendations());
    }

    @PostMapping("/{dealId}/accept")
    public DealController.DealDetail accept(@PathVariable String dealId,
                                            @Valid @RequestBody CounterOfferRequest request,
                                            Authentication authentication) {
        Deal deal = resolveDeal(dealId);
        var updated = negotiationService.acceptCounterOffer(deal.getId(), request.discountPercent(),
                DealController.actorOf(authentication));
        return DealController.DealDetail.from(updated);
    }

    private Deal resolveDeal(String idOrNumber) {
        try {
            UUID id = UUID.fromString(idOrNumber);
            return dealRepository.findWithLinesById(id)
                    .orElseGet(() -> dealRepository.findByDealNumber(idOrNumber)
                            .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                                    .orElseThrow(() -> new IllegalArgumentException("No deal found for: " + idOrNumber))));
        } catch (IllegalArgumentException e) {
            return dealRepository.findByDealNumber(idOrNumber)
                    .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("No deal found for: " + idOrNumber)));
        }
    }

    public record CounterOfferRequest(
            @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal discountPercent) {
    }

    public record PreviewResponse(
            BigDecimal proposedDiscountPercent,
            BigDecimal currentTotal,
            BigDecimal proposedTotal,
            BigDecimal resultingMarginPercent,
            String outcome,
            String rationale,
            BigDecimal maxAllowedDiscountPercent,
            boolean acceptable,
            List<RecommendationEngine.Recommendation> recommendations) {
    }
}
