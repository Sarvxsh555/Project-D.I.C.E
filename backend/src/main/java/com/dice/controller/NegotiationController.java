package com.dice.controller;

import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.service.NegotiationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * "What if?" for pricing. {@code /preview} never changes the deal, so the UI can
 * call it on every slider move; {@code /accept} commits.
 */
@RestController
@RequestMapping("/api/negotiations")
@RequiredArgsConstructor
public class NegotiationController {

    private final NegotiationService negotiationService;

    @PostMapping("/{dealId}/preview")
    public PreviewResponse preview(@PathVariable UUID dealId,
                                   @Valid @RequestBody CounterOfferRequest request) {
        var preview = negotiationService.preview(dealId, request.discountPercent());
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
    public DealController.DealDetail accept(@PathVariable UUID dealId,
                                            @Valid @RequestBody CounterOfferRequest request,
                                            Authentication authentication) {
        var deal = negotiationService.acceptCounterOffer(dealId, request.discountPercent(),
                DealController.actorOf(authentication));
        return DealController.DealDetail.from(deal);
    }

    public record CounterOfferRequest(
            @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal discountPercent) {
    }

    /**
     * @param maxAllowedDiscountPercent the rep's walk-away number
     * @param acceptable true when accepting needs no approval at all
     */
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
