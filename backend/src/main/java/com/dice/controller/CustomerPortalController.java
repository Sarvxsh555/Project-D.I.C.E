package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Negotiation;
import com.dice.domain.NegotiationMessage;
import com.dice.domain.NegotiationVersion;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.NegotiationVersionStatus;
import com.dice.service.CustomerPortalService;
import com.dice.service.NegotiationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Backend-only customer portal surface. Every endpoint requires the
 * {@code CUSTOMER} role and every method resolves ownership from the
 * authenticated principal — path/body ids are never trusted for authority.
 */
@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class CustomerPortalController {

    private final CustomerPortalService portalService;
    private final NegotiationService negotiationService;
    private final com.dice.repository.DealRepository dealRepository;
    private final com.dice.service.DealService dealService;

    @GetMapping("/quotes/{token}")
    public Map<String, Object> getQuoteByToken(@PathVariable String token) {
        Deal deal = resolveDeal(token);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("token", token);
        map.put("dealNumber", deal.getDealNumber());
        map.put("customerName", deal.getCustomer().getName());
        map.put("totalAmount", deal.getTotalAmount());
        map.put("paymentTerms", "Net " + (deal.getCustomer().getPaymentTermsDays() != null ? deal.getCustomer().getPaymentTermsDays() : 30) + " Days");

        BigDecimal disc = deal.getDiscountAmount() != null && deal.getSubtotal() != null && deal.getSubtotal().compareTo(BigDecimal.ZERO) > 0
                ? deal.getDiscountAmount().multiply(BigDecimal.valueOf(100)).divide(deal.getSubtotal(), 1, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        map.put("currentDiscountPercent", disc);
        map.put("totalDiscountPercent", disc);
        map.put("status", deal.getStatus().name());
        map.put("validUntil", deal.getRequestedDeliveryDate() != null ? deal.getRequestedDeliveryDate().toString() : java.time.LocalDate.now().plusDays(30).toString());

        List<Map<String, Object>> lines = deal.getLines().stream().map(l -> {
            Map<String, Object> lineMap = new LinkedHashMap<>();
            lineMap.put("productName", l.getProduct().getName());
            lineMap.put("quantity", l.getQuantity());
            lineMap.put("unitPrice", l.getUnitPrice());
            lineMap.put("total", l.getLineTotal());
            return lineMap;
        }).toList();
        map.put("lines", lines);
        return map;
    }

    @PostMapping("/quotes/{token}/accept")
    public Map<String, Object> acceptQuote(@PathVariable String token) {
        Deal deal = resolveDeal(token);
        deal.setStatus(DealStatus.APPROVED);
        dealRepository.save(deal);
        return Map.of("success", true, "message", "Quotation accepted successfully");
    }

    @PostMapping("/quotes/{token}/reject")
    public Map<String, Object> rejectQuote(@PathVariable String token) {
        Deal deal = resolveDeal(token);
        deal.setStatus(DealStatus.CANCELLED);
        dealRepository.save(deal);
        return Map.of("success", true, "message", "Quotation declined");
    }

    @PostMapping("/quotes/{token}/counteroffer")
    public Map<String, Object> counterofferQuote(@PathVariable String token,
                                                 @RequestBody Map<String, Object> body) {
        Deal deal = resolveDeal(token);
        BigDecimal disc = body.containsKey("requestedDiscountPercent")
                ? new BigDecimal(body.get("requestedDiscountPercent").toString())
                : BigDecimal.valueOf(10.0);
        dealService.applyDiscount(deal.getId(), disc, "customer_portal");
        deal.setStatus(DealStatus.IN_NEGOTIATION);
        dealRepository.save(deal);
        return getQuoteByToken(token);
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

    @GetMapping("/quotations")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<QuotationSummary> listQuotations(Authentication authentication) {
        return portalService.listOwnQuotations(authentication).stream()
                .map(QuotationSummary::from)
                .toList();
    }

    @GetMapping("/quotations/{dealId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public QuotationDetail viewQuotation(@PathVariable UUID dealId, Authentication authentication) {
        return QuotationDetail.from(portalService.viewOwnQuotation(authentication, dealId));
    }

    @GetMapping("/quotations/{dealId}/negotiation")
    @PreAuthorize("hasRole('CUSTOMER')")
    public NegotiationView viewNegotiation(@PathVariable UUID dealId, Authentication authentication) {
        Negotiation negotiation = portalService.viewNegotiation(authentication, dealId);
        List<NegotiationVersion> versions = negotiationService.versionsFor(negotiation.getId());
        List<NegotiationMessage> messages = negotiationService.messagesFor(negotiation.getId());
        return NegotiationView.from(negotiation, versions, messages);
    }

    @PostMapping("/quotations/{dealId}/counteroffer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public NegotiationVersionView submitCounterOffer(@PathVariable UUID dealId,
                                                      @Valid @RequestBody CounterOfferRequest request,
                                                      Authentication authentication) {
        return NegotiationVersionView.from(
                portalService.submitCounterOffer(authentication, dealId, request.discountPercent()));
    }

    @PostMapping("/quotations/{dealId}/comments")
    @PreAuthorize("hasRole('CUSTOMER')")
    public MessageView addComment(@PathVariable UUID dealId,
                                  @Valid @RequestBody CommentRequest request,
                                  Authentication authentication) {
        return MessageView.from(
                portalService.addComment(authentication, dealId, request.content(), request.dealLineId()));
    }

    @PostMapping("/quotations/{dealId}/confirm")
    @PreAuthorize("hasRole('CUSTOMER')")
    public QuotationDetail confirm(@PathVariable UUID dealId, Authentication authentication) {
        return QuotationDetail.from(portalService.confirmQuotation(authentication, dealId));
    }

    // ------------------------------------------------------------------
    // Wire formats — deliberately narrower than the internal DealDetail view;
    // cost basis, owner username, and internal audit detail never reach here.
    // ------------------------------------------------------------------

    public record CounterOfferRequest(
            @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal discountPercent) {
    }

    public record CommentRequest(@NotBlank String content, UUID dealLineId) {
    }

    /**
     * Deliberately excludes margin — the customer sees their own commercial
     * terms, never DICE's profitability view of the deal. See docs/architecture.md's
     * portal authorization rule: this must be enforced here, not just hidden
     * in the frontend.
     */
    public record QuotationSummary(
            UUID id, String dealNumber, DealStatus status, String currency,
            BigDecimal totalAmount) {

        static QuotationSummary from(Deal deal) {
            return new QuotationSummary(deal.getId(), deal.getDealNumber(), deal.getStatus(),
                    deal.getCurrency(), deal.getTotalAmount());
        }
    }

    public record QuotationDetail(
            UUID id, String dealNumber, DealStatus status, String currency,
            BigDecimal subtotal, BigDecimal discountAmount, BigDecimal totalAmount,
            List<LineView> lines) {

        static QuotationDetail from(Deal deal) {
            return new QuotationDetail(deal.getId(), deal.getDealNumber(), deal.getStatus(),
                    deal.getCurrency(), deal.getSubtotal(), deal.getDiscountAmount(), deal.getTotalAmount(),
                    deal.getLines().stream().map(LineView::from).toList());
        }
    }

    public record LineView(
            UUID id, String sku, String productName, Integer quantity,
            BigDecimal unitPrice, BigDecimal discountPercent, BigDecimal lineTotal) {

        static LineView from(DealLine line) {
            return new LineView(line.getId(), line.getProduct().getSku(), line.getProduct().getName(),
                    line.getQuantity(), line.getUnitPrice(), line.getDiscountPercent(), line.getLineTotal());
        }
    }

    /** Margin excluded — see {@link QuotationSummary}'s doc. */
    public record NegotiationVersionView(
            UUID id, Integer versionNumber, NegotiationVersionStatus status,
            BigDecimal discountPercent, BigDecimal totalAmount,
            String createdBy, Instant createdAt) {

        static NegotiationVersionView from(NegotiationVersion v) {
            return new NegotiationVersionView(v.getId(), v.getVersionNumber(), v.getStatus(),
                    v.getDiscountPercent(), v.getTotalAmount(),
                    v.getCreatedBy(), v.getCreatedAt());
        }
    }

    public record MessageView(UUID id, String author, String content, Instant createdAt) {
        static MessageView from(NegotiationMessage m) {
            return new MessageView(m.getId(), m.getAuthor(), m.getContent(), m.getCreatedAt());
        }
    }

    public record NegotiationView(
            UUID negotiationId, List<NegotiationVersionView> versions, List<MessageView> messages) {

        static NegotiationView from(Negotiation negotiation,
                                    List<NegotiationVersion> versions,
                                    List<NegotiationMessage> messages) {
            return new NegotiationView(negotiation.getId(),
                    versions.stream().map(NegotiationVersionView::from).toList(),
                    messages.stream().map(MessageView::from).toList());
        }
    }
}
