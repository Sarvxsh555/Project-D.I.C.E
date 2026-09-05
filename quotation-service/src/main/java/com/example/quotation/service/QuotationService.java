package com.example.quotation.service;

import com.example.quotation.model.*;
import com.example.quotation.repository.ApprovalStepRepository;
import com.example.quotation.repository.AuditEventRepository;
import com.example.quotation.repository.CustomerPriceRepository;
import com.example.quotation.repository.CustomerRepository;
import com.example.quotation.repository.ProductRepository;
import com.example.quotation.repository.QuotationRepository;
import com.example.quotation.web.QuotationLineRequest;
import com.example.quotation.web.QuotationRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class QuotationService {

    /** Above this overall discount %, a quotation cannot go straight to APPROVED - it needs sign-off. */
    private static final double APPROVAL_DISCOUNT_THRESHOLD = 15.0;

    /** Every quotation entering approval runs this chain, in order. */
    private static final List<String> APPROVAL_CHAIN = List.of("Sales Manager", "Finance");

    private final QuotationRepository quotations;
    private final CustomerRepository customers;
    private final ProductRepository products;
    private final CustomerPriceRepository customerPrices;
    private final ApprovalStepRepository approvalSteps;
    private final AuditEventRepository auditEvents;
    private final AtomicInteger quoteSequence = new AtomicInteger(1000);

    public QuotationService(QuotationRepository quotations, CustomerRepository customers,
                             ProductRepository products, CustomerPriceRepository customerPrices,
                             ApprovalStepRepository approvalSteps, AuditEventRepository auditEvents) {
        this.quotations = quotations;
        this.customers = customers;
        this.products = products;
        this.customerPrices = customerPrices;
        this.approvalSteps = approvalSteps;
        this.auditEvents = auditEvents;
    }

    public Quotation create(QuotationRequest request, String repUsername) {
        Customer customer = customers.findById(request.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        Quotation quotation = new Quotation();
        quotation.setQuoteNo(nextQuoteNo());
        quotation.setCustomerId(customer.getId());
        quotation.setCustomerName(customer.getName());
        quotation.setRepUsername(repUsername);
        quotation.setStage(PipelineStage.DRAFT);

        applyLines(quotation, request.getLines(), customer);
        return quotations.save(quotation);
    }

    public Quotation update(Long id, QuotationRequest request) {
        Quotation quotation = getOrThrow(id);
        if (quotation.getStage() != PipelineStage.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only draft quotations can be edited");
        }
        Customer customer = customers.findById(request.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        quotation.getLines().clear();
        quotation.setCustomerId(customer.getId());
        quotation.setCustomerName(customer.getName());
        applyLines(quotation, request.getLines(), customer);
        return quotations.save(quotation);
    }

    public Quotation transition(Long id, PipelineStage toStage, String username) {
        Quotation quotation = getOrThrow(id);
        PipelineStage from = quotation.getStage();

        if (!from.canTransitionTo(toStage)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot move quotation from " + from + " to " + toStage);
        }

        if (toStage == PipelineStage.APPROVED) {
            boolean needsApproval = quotation.getSubtotal() > 0
                    && quotation.getDiscountTotal() / quotation.getSubtotal() * 100.0 > APPROVAL_DISCOUNT_THRESHOLD;
            if (needsApproval && !"APPROVED".equals(quotation.getApprovalStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Discount exceeds " + APPROVAL_DISCOUNT_THRESHOLD + "% - requires manager approval first");
            }
        }

        quotation.setStage(toStage);
        if (toStage == PipelineStage.PENDING_APPROVAL) {
            quotation.setApprovalStatus("PENDING");
            startApprovalChain(quotation);
        } else if (toStage == PipelineStage.APPROVED) {
            quotation.setApprovalStatus("APPROVED");
        } else if (toStage == PipelineStage.DRAFT) {
            quotation.setApprovalStatus("NOT_REQUIRED");
            approvalSteps.deleteByQuotationId(quotation.getId());
        }
        quotation.setUpdatedAt(Instant.now());
        Quotation saved = quotations.save(quotation);
        logAudit(saved, username, "TRANSITION", null, from, toStage);
        return saved;
    }

    /** Approves the next pending step in the chain. Once every step is done, the quotation moves to APPROVED. */
    public Quotation approve(Long id, String username, String reason) {
        Quotation quotation = requirePendingApproval(id);
        ApprovalStep step = nextPendingStep(quotation.getId());

        step.setStatus("APPROVED");
        approvalSteps.save(step);
        logAudit(quotation, username, "APPROVE", reason, quotation.getStage(), quotation.getStage());

        boolean chainComplete = approvalSteps.findByQuotationIdOrderByStepOrderAsc(quotation.getId()).stream()
                .noneMatch(s -> "PENDING".equals(s.getStatus()));

        if (chainComplete) {
            PipelineStage from = quotation.getStage();
            quotation.setStage(PipelineStage.APPROVED);
            quotation.setApprovalStatus("APPROVED");
            quotation.setUpdatedAt(Instant.now());
            quotations.save(quotation);
            logAudit(quotation, username, "TRANSITION", "Approval chain complete", from, PipelineStage.APPROVED);
        }
        return getOrThrow(id);
    }

    public Quotation reject(Long id, String username, String reason) {
        Quotation quotation = requirePendingApproval(id);
        ApprovalStep step = nextPendingStep(quotation.getId());
        step.setStatus("REJECTED");
        approvalSteps.save(step);

        PipelineStage from = quotation.getStage();
        quotation.setStage(PipelineStage.DRAFT);
        quotation.setApprovalStatus("REJECTED");
        quotation.setUpdatedAt(Instant.now());
        quotations.save(quotation);
        logAudit(quotation, username, "REJECT", reason, from, PipelineStage.DRAFT);
        return getOrThrow(id);
    }

    public Quotation returnForRevision(Long id, String username, String reason) {
        Quotation quotation = requirePendingApproval(id);

        PipelineStage from = quotation.getStage();
        quotation.setStage(PipelineStage.DRAFT);
        quotation.setApprovalStatus("RETURNED");
        quotation.setUpdatedAt(Instant.now());
        quotations.save(quotation);
        approvalSteps.deleteByQuotationId(quotation.getId());
        logAudit(quotation, username, "RETURN", reason, from, PipelineStage.DRAFT);
        return getOrThrow(id);
    }

    public List<ApprovalStep> getApprovalChain(Long id) {
        return approvalSteps.findByQuotationIdOrderByStepOrderAsc(id);
    }

    public List<AuditEvent> getAuditHistory(Long id) {
        return auditEvents.findByQuotationIdOrderByCreatedAtAsc(id);
    }

    public Quotation getOrThrow(Long id) {
        return quotations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
    }

    private Quotation requirePendingApproval(Long id) {
        Quotation quotation = getOrThrow(id);
        if (quotation.getStage() != PipelineStage.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Quotation is not awaiting approval");
        }
        return quotation;
    }

    private ApprovalStep nextPendingStep(Long quotationId) {
        return approvalSteps.findByQuotationIdOrderByStepOrderAsc(quotationId).stream()
                .filter(s -> "PENDING".equals(s.getStatus()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No pending approval step"));
    }

    private void startApprovalChain(Quotation quotation) {
        approvalSteps.deleteByQuotationId(quotation.getId());
        for (int i = 0; i < APPROVAL_CHAIN.size(); i++) {
            ApprovalStep step = new ApprovalStep();
            step.setQuotationId(quotation.getId());
            step.setStepOrder(i);
            step.setName(APPROVAL_CHAIN.get(i));
            step.setStatus("PENDING");
            approvalSteps.save(step);
        }
    }

    private void logAudit(Quotation quotation, String username, String action, String reason,
                           PipelineStage from, PipelineStage to) {
        AuditEvent event = new AuditEvent();
        event.setQuotationId(quotation.getId());
        event.setUsername(username);
        event.setAction(action);
        event.setReason(reason);
        event.setFromStage(from != null ? from.name() : null);
        event.setToStage(to != null ? to.name() : null);
        auditEvents.save(event);
    }

    private void applyLines(Quotation quotation, List<QuotationLineRequest> lineRequests, Customer customer) {
        for (QuotationLineRequest lineRequest : lineRequests) {
            Product product = products.findById(lineRequest.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Product " + lineRequest.getProductId() + " not found"));

            double unitPrice = customerPrices.findByCustomerIdAndProductId(customer.getId(), product.getId())
                    .map(CustomerPrice::getPrice)
                    .orElse(product.getUnitPrice());

            QuotationLine line = new QuotationLine();
            line.setQuotation(quotation);
            line.setProductId(product.getId());
            line.setProductName(product.getName());
            line.setQuantity(lineRequest.getQuantity());
            line.setUnitPrice(unitPrice);
            line.setDiscountPercent(lineRequest.getDiscountPercent());
            line.setTaxPercent(product.getTaxRate());

            QuotationCalculator.applyLine(line, product);
            quotation.getLines().add(line);
        }
        QuotationCalculator.recomputeTotals(quotation);
    }

    private String nextQuoteNo() {
        String year = String.valueOf(LocalDate.now(ZoneOffset.UTC).getYear());
        String candidate;
        do {
            candidate = "Q-" + year + "-" + quoteSequence.incrementAndGet();
        } while (quotations.existsByQuoteNo(candidate));
        return candidate;
    }
}
