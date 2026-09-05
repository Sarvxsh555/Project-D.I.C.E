package com.example.quotation.controller;

import com.example.quotation.model.ApprovalStep;
import com.example.quotation.model.AuditEvent;
import com.example.quotation.model.PipelineStage;
import com.example.quotation.model.Quotation;
import com.example.quotation.repository.QuotationRepository;
import com.example.quotation.service.QuotationService;
import com.example.quotation.service.QuotationSpecifications;
import com.example.quotation.web.ApprovalActionRequest;
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
            @RequestParam(defaultValue = "10") int size) {

        var spec = QuotationSpecifications.filter(status, customerId, rep, from, to, minAmount, maxAmount, q);
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return quotationRepository.findAll(spec, pageable);
    }

    @GetMapping("/{id}")
    public Quotation get(@PathVariable Long id) {
        return quotationService.getOrThrow(id);
    }

    @PostMapping
    public ResponseEntity<Quotation> create(@Valid @RequestBody QuotationRequest request, Authentication authentication) {
        Quotation created = quotationService.create(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public Quotation update(@PathVariable Long id, @Valid @RequestBody QuotationRequest request) {
        return quotationService.update(id, request);
    }

    @PostMapping("/{id}/transition")
    public Quotation transition(@PathVariable Long id, @Valid @RequestBody TransitionRequest request,
                                 Authentication authentication) {
        return quotationService.transition(id, request.getToStage(), authentication.getName());
    }

    @GetMapping("/{id}/approval-chain")
    public List<ApprovalStep> approvalChain(@PathVariable Long id) {
        return quotationService.getApprovalChain(id);
    }

    @GetMapping("/{id}/audit")
    public List<AuditEvent> audit(@PathVariable Long id) {
        return quotationService.getAuditHistory(id);
    }

    @PostMapping("/{id}/approve")
    public Quotation approve(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                              Authentication authentication) {
        return quotationService.approve(id, authentication.getName(), request.getReason());
    }

    @PostMapping("/{id}/reject")
    public Quotation reject(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                             Authentication authentication) {
        return quotationService.reject(id, authentication.getName(), request.getReason());
    }

    @PostMapping("/{id}/return")
    public Quotation returnForRevision(@PathVariable Long id, @Valid @RequestBody ApprovalActionRequest request,
                                        Authentication authentication) {
        return quotationService.returnForRevision(id, authentication.getName(), request.getReason());
    }
}
