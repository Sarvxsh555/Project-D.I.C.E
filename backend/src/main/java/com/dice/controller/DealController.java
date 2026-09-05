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
    private final com.dice.service.CoPurchaseRecommendationService recommendationService;
    private final com.dice.repository.DealRepository dealRepository;
    private final com.dice.repository.DecisionRepository decisionRepository;

    @GetMapping("/health")
    public java.util.Map<String, Object> healthOverview() {
        List<Deal> allDeals = dealRepository.findAll();
        long healthy = allDeals.stream().filter(d -> d.getHealthScore() != null && d.getHealthScore() >= 80).count();
        long atRisk = allDeals.stream().filter(d -> d.getHealthScore() != null && d.getHealthScore() >= 60 && d.getHealthScore() < 80).count();
        long critical = allDeals.stream().filter(d -> d.getHealthScore() != null && d.getHealthScore() < 60).count();

        List<java.util.Map<String, Object>> dealsList = allDeals.stream().map(d -> {
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("dealId", d.getId());
            map.put("dealNumber", d.getDealNumber());
            map.put("customerName", d.getCustomer().getName());
            map.put("healthScore", d.getHealthScore() != null ? d.getHealthScore() : 85);
            map.put("riskLevel", d.getRiskLevel() != null ? d.getRiskLevel().name() : "LOW");
            map.put("margin", d.getMarginPercent());
            map.put("status", d.getStatus().name());
            map.put("totalAmount", d.getTotalAmount());
            map.put("anomalyDetected", d.getRiskScore() != null && d.getRiskScore() > 20);
            return map;
        }).toList();

        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("healthyCount", healthy);
        response.put("atRiskCount", atRisk);
        response.put("criticalCount", critical);
        response.put("deals", dealsList);
        return response;
    }

    @GetMapping("/anomalies")
    public List<java.util.Map<String, Object>> anomalies() {
        return dealRepository.findAll().stream()
                .filter(d -> (d.getRiskScore() != null && d.getRiskScore() >= 20) || d.getStatus() == DealStatus.PENDING_APPROVAL)
                .map(d -> {
                    java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("dealId", d.getId());
                    map.put("dealNumber", d.getDealNumber());
                    map.put("customerName", d.getCustomer().getName());
                    map.put("type", d.getStatus() == DealStatus.PENDING_APPROVAL ? "APPROVAL_PENDING" : "MARGIN_DRIFT");
                    map.put("severity", d.getRiskLevel() != null ? d.getRiskLevel().name() : "LOW");
                    map.put("description", "Quotation requires commercial review for " + d.getCustomer().getName());
                    map.put("detectedAt", d.getUpdatedAt() != null ? d.getUpdatedAt() : java.time.Instant.now());
                    return map;
                }).toList();
    }

    @GetMapping("/health/metrics")
    public List<java.util.Map<String, Object>> healthMetrics() {
        return dealRepository.findAll().stream().map(d -> {
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("dealId", d.getId());
            map.put("dealNumber", d.getDealNumber());
            map.put("customerName", d.getCustomer().getName());
            map.put("healthScore", d.getHealthScore() != null ? d.getHealthScore() : 85);
            map.put("riskLevel", d.getRiskLevel() != null ? d.getRiskLevel().name() : "LOW");
            return map;
        }).toList();
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

    @GetMapping("/{id}/health")
    public java.util.Map<String, Object> dealHealth(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        java.util.Map<String, Object> res = new java.util.LinkedHashMap<>();
        res.put("score", deal.getHealthScore() != null ? deal.getHealthScore() : 85);
        res.put("band", deal.getHealthScore() != null && deal.getHealthScore() >= 80 ? "HEALTHY" : "NEEDS_ATTENTION");
        res.put("riskScore", deal.getRiskScore());
        res.put("riskLevel", deal.getRiskLevel() != null ? deal.getRiskLevel().name() : "LOW");
        res.put("marginPercent", deal.getMarginPercent());
        return res;
    }

    @GetMapping("/{id}/decision")
    public java.util.Map<String, Object> dealDecision(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        com.dice.domain.Decision decision = decisionRepository.findFirstByDealIdOrderByCreatedAtDesc(deal.getId()).orElse(null);
        java.util.Map<String, Object> res = new java.util.LinkedHashMap<>();
        res.put("dealId", deal.getId());
        res.put("outcome", decision != null ? decision.getOutcome().name() : "AUTO_APPROVE");
        res.put("rationale", decision != null ? decision.getRationale() : "Deal evaluated against standard commercial policies.");
        res.put("approvalRequired", deal.getStatus() == DealStatus.PENDING_APPROVAL);
        res.put("riskScore", deal.getRiskScore());
        res.put("riskLevel", deal.getRiskLevel() != null ? deal.getRiskLevel().name() : "LOW");
        res.put("marginPercent", deal.getMarginPercent());
        return res;
    }

    @RequestMapping(value = "/{id}/simulate", method = {RequestMethod.GET, RequestMethod.POST})
    public java.util.Map<String, Object> simulate(@PathVariable String id, @RequestBody(required = false) java.util.Map<String, Object> body) {
        Deal deal = resolveDeal(id);
        BigDecimal disc = BigDecimal.valueOf(10.0);
        if (body != null && body.containsKey("discount")) {
            disc = new BigDecimal(body.get("discount").toString());
        }
        BigDecimal subtotal = deal.getSubtotal();
        BigDecimal newDiscountAmount = subtotal.multiply(disc).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal newTotal = subtotal.subtract(newDiscountAmount);
        BigDecimal margin = deal.getMarginPercent();

        java.util.Map<String, Object> res = new java.util.LinkedHashMap<>();
        java.util.Map<String, Object> simulated = new java.util.LinkedHashMap<>();
        simulated.put("total", newTotal);
        simulated.put("margin", margin);
        simulated.put("risk", deal.getRiskScore());
        simulated.put("approvalRequired", disc.compareTo(BigDecimal.valueOf(15.0)) > 0);
        res.put("simulated", simulated);
        res.put("recommendations", List.of());
        return res;
    }

    @GetMapping
    public Page<DealSummary> list(@RequestParam(required = false) DealStatus status,
                                  Pageable pageable) {
        Page<Deal> deals = status == null
                ? dealService.list(pageable)
                : dealService.listByStatus(status, pageable);
        return deals.map(DealSummary::from);
    }

    @GetMapping("/{id}")
    public DealDetail get(@PathVariable String id) {
        return DealDetail.from(resolveDeal(id));
    }

    @GetMapping("/{id}/evaluations")
    public List<EvaluationSummary> evaluations(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        return dealService.history(deal.getId()).stream().map(EvaluationSummary::from).toList();
    }

    @GetMapping("/{id}/recommendations")
    public com.dice.domain.RecommendationResult recommendations(@PathVariable UUID id,
                                                                @RequestParam(defaultValue = "5") int limit) {
        return recommendationService.recommend(id, limit);
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
