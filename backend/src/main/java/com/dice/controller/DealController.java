package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.domain.Evaluation;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.RiskLevel;
import com.dice.events.DealEvent;
import com.dice.service.DealService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Deal CRUD and evaluation. The main surface the sales UI talks to. */
@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
public class DealController {

    private final DealService dealService;

    @GetMapping
    public Page<DealSummary> list(@RequestParam(required = false) DealStatus status,
                                  Pageable pageable) {
        Page<Deal> deals = status == null
                ? dealService.list(pageable)
                : dealService.listByStatus(status, pageable);
        return deals.map(DealSummary::from);
    }

    @GetMapping("/{id}")
    public DealDetail get(@PathVariable UUID id) {
        return DealDetail.from(dealService.require(id));
    }

    @GetMapping("/{id}/evaluations")
    public List<EvaluationSummary> evaluations(@PathVariable UUID id) {
        return dealService.history(id).stream().map(EvaluationSummary::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SALES_REP', 'SALES_MANAGER', 'ADMIN')")
    public ResponseEntity<DealDetail> create(@Valid @RequestBody CreateDealRequest request,
                                             Authentication authentication) {
        Deal deal = dealService.create(
                request.customerId(),
                request.lines().stream()
                        .map(l -> new DealService.LineRequest(
                                l.productId(), l.quantity(), l.unitPrice(), l.discountPercent()))
                        .toList(),
                request.requestedDeliveryDate(),
                actorOf(authentication));

        return ResponseEntity
                .created(java.net.URI.create("/api/deals/" + deal.getId()))
                .body(DealDetail.from(dealService.require(deal.getId())));
    }

    @PutMapping("/{id}/lines")
    @PreAuthorize("hasAnyRole('SALES_REP', 'SALES_MANAGER', 'ADMIN')")
    public DealDetail replaceLines(@PathVariable UUID id,
                                   @Valid @RequestBody ReplaceLinesRequest request,
                                   Authentication authentication) {
        dealService.replaceLines(id,
                request.lines().stream()
                        .map(l -> new DealService.LineRequest(
                                l.productId(), l.quantity(), l.unitPrice(), l.discountPercent()))
                        .toList(),
                actorOf(authentication));
        return DealDetail.from(dealService.require(id));
    }

    @PostMapping("/{id}/discount")
    @PreAuthorize("hasAnyRole('SALES_REP', 'SALES_MANAGER', 'ADMIN')")
    public DealDetail applyDiscount(@PathVariable UUID id,
                                    @Valid @RequestBody DiscountRequest request,
                                    Authentication authentication) {
        dealService.applyDiscount(id, request.discountPercent(), actorOf(authentication));
        return DealDetail.from(dealService.require(id));
    }

    /** Force a fresh run of the engines without changing anything. */
    @PostMapping("/{id}/evaluate")
    public DealDetail evaluate(@PathVariable UUID id, Authentication authentication) {
        dealService.evaluate(id, DealEvent.Type.DEAL_EVALUATED, actorOf(authentication));
        return DealDetail.from(dealService.require(id));
    }

    static String actorOf(Authentication authentication) {
        return authentication == null ? "system" : authentication.getName();
    }

    // ------------------------------------------------------------------
    // Wire formats. Entities are never serialised directly — lazy proxies and
    // bidirectional line references do not survive Jackson.
    // ------------------------------------------------------------------

    public record CreateDealRequest(
            @NotNull UUID customerId,
            @NotEmpty List<LinePayload> lines,
            LocalDate requestedDeliveryDate) {
    }

    public record ReplaceLinesRequest(@NotEmpty List<LinePayload> lines) {
    }

    public record LinePayload(
            @NotNull UUID productId,
            @NotNull @Positive Integer quantity,
            BigDecimal unitPrice,
            @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal discountPercent) {
    }

    public record DiscountRequest(
            @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal discountPercent) {
    }

    public record DealSummary(
            UUID id, String dealNumber, String customerName, DealStatus status,
            BigDecimal totalAmount, BigDecimal marginPercent, Integer riskScore,
            RiskLevel riskLevel, Integer healthScore, String currency) {

        static DealSummary from(Deal deal) {
            return new DealSummary(deal.getId(), deal.getDealNumber(),
                    deal.getCustomer().getName(), deal.getStatus(), deal.getTotalAmount(),
                    deal.getMarginPercent(), deal.getRiskScore(), deal.getRiskLevel(),
                    deal.getHealthScore(), deal.getCurrency());
        }
    }

    public record DealDetail(
            UUID id, String dealNumber, UUID customerId, String customerName,
            DealStatus status, String currency, BigDecimal subtotal,
            BigDecimal discountAmount, BigDecimal totalAmount, BigDecimal marginPercent,
            Integer riskScore, RiskLevel riskLevel, Integer healthScore,
            LocalDate requestedDeliveryDate, String ownerUsername, List<LineView> lines) {

        static DealDetail from(Deal deal) {
            return new DealDetail(deal.getId(), deal.getDealNumber(),
                    deal.getCustomer().getId(), deal.getCustomer().getName(),
                    deal.getStatus(), deal.getCurrency(), deal.getSubtotal(),
                    deal.getDiscountAmount(), deal.getTotalAmount(), deal.getMarginPercent(),
                    deal.getRiskScore(), deal.getRiskLevel(), deal.getHealthScore(),
                    deal.getRequestedDeliveryDate(), deal.getOwnerUsername(),
                    deal.getLines().stream().map(LineView::from).toList());
        }
    }

    public record LineView(
            UUID id, Integer lineNumber, UUID productId, String sku, String productName,
            Integer quantity, BigDecimal unitPrice, BigDecimal discountPercent,
            BigDecimal lineTotal, BigDecimal marginPercent, String fulfillmentStatus) {

        static LineView from(com.dice.domain.DealLine line) {
            return new LineView(line.getId(), line.getLineNumber(),
                    line.getProduct().getId(), line.getProduct().getSku(),
                    line.getProduct().getName(), line.getQuantity(), line.getUnitPrice(),
                    line.getDiscountPercent(), line.getLineTotal(), line.getMarginPercent(),
                    line.getFulfillmentStatus().name());
        }
    }

    public record EvaluationSummary(
            UUID id, String triggeredBy, BigDecimal marginPercent, BigDecimal discountPercent,
            Integer riskScore, RiskLevel riskLevel, Integer healthScore, String outcome,
            String policyResults, java.time.Instant createdAt) {

        static EvaluationSummary from(Evaluation e) {
            return new EvaluationSummary(e.getId(), e.getTriggeredBy(), e.getMarginPercent(),
                    e.getDiscountPercent(), e.getRiskScore(), e.getRiskLevel(), e.getHealthScore(),
                    e.getOutcome().name(), e.getPolicyResults(), e.getCreatedAt());
        }
    }
}
