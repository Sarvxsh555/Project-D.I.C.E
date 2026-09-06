package com.example.quotation.controller;

import com.example.quotation.model.ApprovalStep;
import com.example.quotation.model.AuditEvent;
import com.example.quotation.model.PipelineStage;
import com.example.quotation.model.Quotation;
import com.example.quotation.repository.QuotationRepository;
import com.example.quotation.security.UserPrincipal;
import com.example.quotation.service.QuotationService;
import com.example.quotation.service.QuotationSpecifications;
import com.example.quotation.web.ApprovalActionRequest;
import com.example.quotation.web.CounterDiscountRequest;
import com.example.quotation.web.QuotationRequest;
import com.example.quotation.web.TransitionRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/quotations")
public class QuotationController {

    private final QuotationService quotationService;
    private final QuotationRepository quotationRepository;

    public QuotationController(QuotationService quotationService, QuotationRepository quotationRepository) {
        this.quotationService = quotationService;
        this.quotationRepository = quotationRepository;
    }

    @GetMapping
    public Page<Quotation> list(
            @RequestParam(required = false) PipelineStage status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String rep,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        UserPrincipal actor = UserPrincipal.from(authentication);
        Long scopedCustomerId = customerId;
        if (actor.isCustomer()) {
            if (actor.customerId() == null) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN, "This customer login is not linked to an account");
            }
            scopedCustomerId = actor.customerId();
        }
        var spec = QuotationSpecifications.filter(status, scopedCustomerId, rep, from, to, minAmount, maxAmount, q);
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<Quotation> results = quotationRepository.findAll(spec, pageable);
        results.forEach(q2 -> quotationService.sanitizeForCustomer(q2, actor));
        return results;
    }

    @GetMapping("/{id}")
    public Quotation get(@PathVariable Long id, Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        return quotationService.sanitizeForCustomer(quotationService.getVisibleTo(id, actor), actor);
    }

    @PostMapping
    public ResponseEntity<Quotation> create(@Valid @RequestBody QuotationRequest request, Authentication authentication) {
        Quotation created = quotationService.create(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public Quotation update(@PathVariable Long id, @Valid @RequestBody QuotationRequest request,
                             Authentication authentication) {
        return quotationService.update(id, request, UserPrincipal.from(authentication));
    }

    @PostMapping("/{id}/transition")
    public Quotation transition(@PathVariable Long id, @Valid @RequestBody TransitionRequest request,
                                 @RequestHeader("Authorization") String authHeader, Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        return quotationService.transition(id, request.getToStage(), authentication.getName(), actor, bearer(authHeader));
    }

    @GetMapping("/{id}/approval-chain")
    public List<ApprovalStep> approvalChain(@PathVariable Long id, Authentication authentication) {
        return quotationService.getApprovalChain(id, UserPrincipal.from(authentication));
    }

    @GetMapping("/{id}/risk-breakdown")
    public List<com.example.quotation.service.DiceEngine.CategoryRisk> riskBreakdown(
            @PathVariable Long id, Authentication authentication) {
        return quotationService.getRiskBreakdown(id, UserPrincipal.from(authentication));
    }

    @PostMapping("/risk-preview")
    public com.example.quotation.service.DiceEngine.Decision riskPreview(@Valid @RequestBody QuotationRequest request) {
        return quotationService.previewRisk(request);
    }

    @GetMapping("/{id}/audit")
    public List<AuditEvent> audit(@PathVariable Long id, Authentication authentication) {
        return quotationService.getAuditHistory(id, UserPrincipal.from(authentication));
    }

    @PostMapping("/{id}/counter-discount")
    public Quotation counterDiscount(@PathVariable Long id, @Valid @RequestBody CounterDiscountRequest request,
                                      Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        Quotation saved = quotationService.applyCounterDiscount(id, request.getLineId(),
                request.getProposedDiscountPercent(), request.getReason(), actor);
        return quotationService.sanitizeForCustomer(saved, actor);
    }

    @PostMapping("/{id}/approve")
    public Quotation approve(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                              @RequestHeader("Authorization") String authHeader, Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        return quotationService.approve(id, actor.username(), actor.role(), request.getReason(), bearer(authHeader));
    }

    @PostMapping("/{id}/reject")
    public Quotation reject(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                             Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        return quotationService.reject(id, actor.username(), actor.role(), request.getReason());
    }

    @PostMapping("/{id}/return")
    public Quotation returnForRevision(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                                        Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        return quotationService.returnForRevision(id, actor.username(), actor.role(), request.getReason());
    }

    @PostMapping("/{id}/customer-confirm")
    public Quotation customerConfirm(@PathVariable Long id, @RequestHeader("Authorization") String authHeader,
                                      Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        Quotation saved = quotationService.customerConfirm(id, actor, bearer(authHeader));
        return quotationService.sanitizeForCustomer(saved, actor);
    }

    private String bearer(String authHeader) {
        return authHeader.replaceFirst("^Bearer ", "");
    }
}
