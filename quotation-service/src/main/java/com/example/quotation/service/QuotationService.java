package com.example.quotation.service;

import com.example.quotation.client.DealEngineClient;
import com.example.quotation.model.*;
import com.example.quotation.repository.ApprovalStepRepository;
import com.example.quotation.repository.AuditEventRepository;
import com.example.quotation.repository.CustomerPriceRepository;
import com.example.quotation.repository.CustomerRepository;
import com.example.quotation.repository.ProductRepository;
import com.example.quotation.repository.QuotationRepository;
import com.example.quotation.security.UserPrincipal;
import com.example.quotation.web.QuotationLineRequest;
import com.example.quotation.web.QuotationRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Transactional
public class QuotationService {

    private final QuotationRepository quotations;
    private final CustomerRepository customers;
    private final ProductRepository products;
    private final CustomerPriceRepository customerPrices;
    private final ApprovalStepRepository approvalSteps;
    private final AuditEventRepository auditEvents;
    private final DiceEngine diceEngine;
    private final DealEngineClient dealEngineClient;
    private final AtomicInteger quoteSequence = new AtomicInteger(1000);

    public QuotationService(QuotationRepository quotations, CustomerRepository customers,
                             ProductRepository products, CustomerPriceRepository customerPrices,
                             ApprovalStepRepository approvalSteps, AuditEventRepository auditEvents,
                             DiceEngine diceEngine, DealEngineClient dealEngineClient) {
        this.quotations = quotations;
        this.customers = customers;
        this.products = products;
        this.customerPrices = customerPrices;
        this.approvalSteps = approvalSteps;
        this.auditEvents = auditEvents;
        this.diceEngine = diceEngine;
        this.dealEngineClient = dealEngineClient;
    }

    /**
     * Fires exactly once a quotation actually becomes an order: opens the deal in deal-engine
     * and immediately converts it, so ORDERED quotations always have a real Deal + Order
     * behind them instead of leaving those deal-engine endpoints orphaned. Runs inside the
     * same transaction as the stage flip - if deal-engine rejects it, the ORDERED transition
     * rolls back too, so the two services never disagree about whether an order exists.
     */
    private void openAndConvertDeal(Quotation quotation, String bearerToken) {
        if (bearerToken == null) return;
        Long dealId = dealEngineClient.createDeal(quotation.getId(), bearerToken);
        dealEngineClient.convertToOrder(dealId, bearerToken);
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
        quotation.setRiskScore(diceEngine.evaluate(quotation).riskScore());
        return quotations.save(quotation);
    }

    public Quotation update(Long id, QuotationRequest request, UserPrincipal actor) {
        if (actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Customers cannot edit quotations");
        }
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
        quotation.setRiskScore(diceEngine.evaluate(quotation).riskScore());
        return quotations.save(quotation);
    }

    public Quotation transition(Long id, PipelineStage toStage, String username, UserPrincipal actor, String bearerToken) {
        Quotation quotation = getOrThrow(id);
        assertCustomerAccess(quotation, actor);
        PipelineStage from = quotation.getStage();

        if (!from.canTransitionTo(toStage)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot move quotation from " + from + " to " + toStage);
        }

        if (toStage == PipelineStage.APPROVED) {
            DiceEngine.Decision decision = diceEngine.evaluate(quotation);
            quotation.setRiskScore(decision.riskScore());
            if (!decision.autoApprove() && !"APPROVED".equals(quotation.getApprovalStatus())
                    && !"AUTO_APPROVED".equals(quotation.getApprovalStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This quote requires " + decision.requiredLevel() + " approval first");
            }
        }

        if (toStage == PipelineStage.PENDING_APPROVAL) {
            return submitForApproval(quotation, username, from, bearerToken);
        }

        quotation.setStage(toStage);
        if (toStage == PipelineStage.APPROVED) {
            quotation.setApprovalStatus("APPROVED");
        } else if (toStage == PipelineStage.DRAFT) {
            quotation.setApprovalStatus("NOT_REQUIRED");
            quotation.setCustomerAccepted(false);
            approvalSteps.deleteByQuotationId(quotation.getId());
        }
        quotation.setUpdatedAt(Instant.now());
        Quotation saved = quotations.save(quotation);
        logAudit(saved, username, "TRANSITION", null, from, toStage);
        return saved;
    }

    /**
     * Customer agrees to the current price with no further counter. Low-risk quotes
     * auto-approve and move toward order; high-risk quotes enter the internal chain
     * already marked as customer-accepted.
     */
    public Quotation customerConfirm(Long id, UserPrincipal actor, String bearerToken) {
        if (!actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the customer can confirm these terms");
        }
        Quotation quotation = getOrThrow(id);
        assertCustomerAccess(quotation, actor);
        PipelineStage from = quotation.getStage();
        if (from != PipelineStage.DRAFT && from != PipelineStage.NEGOTIATION && from != PipelineStage.APPROVED
                && from != PipelineStage.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This quotation cannot be confirmed in stage " + from);
        }

        quotation.setCustomerAccepted(true);
        logAudit(quotation, actor.username(), "CUSTOMER_ACCEPT",
                "Customer agreed to current terms with no further counter", from, from);

        if (from == PipelineStage.APPROVED) {
            quotation.setStage(PipelineStage.ORDERED);
            quotation.setUpdatedAt(Instant.now());
            Quotation saved = quotations.save(quotation);
            logAudit(saved, actor.username(), "TRANSITION", "Customer confirmed — proceeding to order",
                    PipelineStage.APPROVED, PipelineStage.ORDERED);
            openAndConvertDeal(saved, bearerToken);
            return saved;
        }

        if (from == PipelineStage.PENDING_APPROVAL) {
            quotation.setUpdatedAt(Instant.now());
            return quotations.save(quotation);
        }

        return submitForApproval(quotation, actor.username(), from, bearerToken);
    }

    public Quotation getVisibleTo(Long id, UserPrincipal actor) {
        Quotation quotation = getOrThrow(id);
        assertCustomerAccess(quotation, actor);
        return quotation;
    }

    public List<DiceEngine.CategoryRisk> getRiskBreakdown(Long id, UserPrincipal actor) {
        Quotation quotation = getVisibleTo(id, actor);
        if (actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Internal risk data is not customer-visible");
        }
        return diceEngine.evaluate(quotation).categoryBreakdown();
    }

    /**
     * Live blended-risk preview while a rep is still building a quote in the browser —
     * mirrors create()'s math but never touches the database, so it's safe to call on every edit.
     */
    public DiceEngine.Decision previewRisk(QuotationRequest request) {
        Customer customer = customers.findById(request.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        Quotation quotation = new Quotation();
        quotation.setCustomerId(customer.getId());
        applyLines(quotation, request.getLines(), customer);
        return diceEngine.evaluate(quotation);
    }

    public void assertCustomerAccess(Quotation quotation, UserPrincipal actor) {
        if (actor.isCustomer()) {
            if (actor.customerId() == null || !actor.customerId().equals(quotation.getCustomerId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This quotation belongs to another account");
            }
        }
    }

    private Quotation submitForApproval(Quotation quotation, String username, PipelineStage from) {
        DiceEngine.Decision decision = diceEngine.evaluate(quotation);
        quotation.setRiskScore(decision.riskScore());
        for (String reason : decision.reasons()) {
            logAudit(quotation, "system:dice", "DICE", reason, from, from);
        }

        if (decision.autoApprove()) {
            approvalSteps.deleteByQuotationId(quotation.getId());
            quotation.setStage(PipelineStage.APPROVED);
            quotation.setApprovalStatus("AUTO_APPROVED");
            quotation.setUpdatedAt(Instant.now());
            Quotation saved = quotations.save(quotation);
            logAudit(saved, "system:dice", "AUTO_APPROVE",
                    "Risk " + Math.round(decision.riskScore()) + " — pipeline skipped the human queue",
                    from, PipelineStage.APPROVED);
            if (saved.isCustomerAccepted()) {
                saved.setStage(PipelineStage.ORDERED);
                saved.setUpdatedAt(Instant.now());
                saved = quotations.save(saved);
                logAudit(saved, username, "TRANSITION", "Customer already accepted — auto-approved terms become an order",
                        PipelineStage.APPROVED, PipelineStage.ORDERED);
            }
            return saved;
        }

        quotation.setStage(PipelineStage.PENDING_APPROVAL);
        quotation.setApprovalStatus("PENDING");
        startApprovalChain(quotation, decision.chain());
        quotation.setUpdatedAt(Instant.now());
        Quotation saved = quotations.save(quotation);
        logAudit(saved, username, "TRANSITION",
                "Routed to " + decision.requiredLevel() + " (risk " + Math.round(decision.riskScore()) + ")",
                from, PipelineStage.PENDING_APPROVAL);
        return saved;
    }

    /** Approves the next pending step in the chain. Once every step is done, the quotation moves to APPROVED. */
    public Quotation approve(Long id, String username, String role, String reason) {
        if (!List.of("ADMIN", "SALES_MANAGER", "FINANCE").contains(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have approval authority");
        }
        Quotation quotation = requirePendingApproval(id);
        ApprovalStep step = nextPendingStep(quotation.getId());
        assertStepRole(role, step);

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
            if (quotation.isCustomerAccepted()) {
                quotation.setStage(PipelineStage.ORDERED);
                quotation.setUpdatedAt(Instant.now());
                quotations.save(quotation);
                logAudit(quotation, username, "TRANSITION", "Customer already accepted — moving to order",
                        PipelineStage.APPROVED, PipelineStage.ORDERED);
            }
        }
        return getOrThrow(id);
    }

    public Quotation reject(Long id, String username, String role, String reason) {
        assertApprover(role);
        Quotation quotation = requirePendingApproval(id);
        ApprovalStep step = nextPendingStep(quotation.getId());
        assertStepRole(role, step);
        step.setStatus("REJECTED");
        approvalSteps.save(step);

        PipelineStage from = quotation.getStage();
        quotation.setStage(PipelineStage.DRAFT);
        quotation.setApprovalStatus("REJECTED");
        quotation.setCustomerAccepted(false);
        quotation.setUpdatedAt(Instant.now());
        quotations.save(quotation);
        logAudit(quotation, username, "REJECT", reason, from, PipelineStage.DRAFT);
        return getOrThrow(id);
    }

    public Quotation returnForRevision(Long id, String username, String role, String reason) {
        assertApprover(role);
        Quotation quotation = requirePendingApproval(id);
        ApprovalStep step = nextPendingStep(quotation.getId());
        assertStepRole(role, step);

        PipelineStage from = quotation.getStage();
        quotation.setStage(PipelineStage.DRAFT);
        quotation.setApprovalStatus("RETURNED");
        quotation.setCustomerAccepted(false);
        quotation.setUpdatedAt(Instant.now());
        quotations.save(quotation);
        approvalSteps.deleteByQuotationId(quotation.getId());
        logAudit(quotation, username, "RETURN", reason, from, PipelineStage.DRAFT);
        return getOrThrow(id);
    }

    /**
     * Applies a customer's counter-discount to a single line. Only legal once a quote has
     * reached APPROVED (or is already mid-negotiation) - this is what the Negotiation Engine
     * calls after it records the request, and it's the only way an APPROVED quote's numbers
     * can change. The stage flip to NEGOTIATION is what makes the change externally visible
     * as "this approval is now stale" - approval-engine's version hash will no longer match.
     */
    public Quotation applyCounterDiscount(Long id, Long lineId, double proposedDiscountPercent, String reason, UserPrincipal actor) {
        Quotation quotation = getOrThrow(id);
        assertCustomerAccess(quotation, actor);
        String username = actor.username();
        PipelineStage from = quotation.getStage();

        if (from != PipelineStage.APPROVED && from != PipelineStage.NEGOTIATION
                && from != PipelineStage.DRAFT && from != PipelineStage.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Counter-discounts can only be negotiated on a live quotation (currently " + from + ")");
        }

        QuotationLine line = quotation.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Line not found on this quotation"));

        Product product = products.findById(line.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        double previousDiscount = line.getDiscountPercent();
        line.setDiscountPercent(proposedDiscountPercent);
        QuotationCalculator.applyLine(line, product);
        QuotationCalculator.recomputeTotals(quotation);

        if (from == PipelineStage.APPROVED || from == PipelineStage.PENDING_APPROVAL || from == PipelineStage.DRAFT) {
            if (from != PipelineStage.NEGOTIATION) {
                quotation.setStage(PipelineStage.NEGOTIATION);
            }
            quotation.setApprovalStatus("NOT_REQUIRED");
            quotation.setCustomerAccepted(false);
            approvalSteps.deleteByQuotationId(quotation.getId());
        }
        quotation.setUpdatedAt(Instant.now());
        Quotation saved = quotations.save(quotation);

        logAudit(saved, username, "COUNTER_DISCOUNT",
                String.format("%s: %.1f%% -> %.1f%% (%s)", line.getProductName(), previousDiscount, proposedDiscountPercent, reason),
                from, saved.getStage());
        return saved;
    }

    public List<ApprovalStep> getApprovalChain(Long id, UserPrincipal actor) {
        Quotation quotation = getVisibleTo(id, actor);
        if (actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Internal approval details are not customer-visible");
        }
        return approvalSteps.findByQuotationIdOrderByStepOrderAsc(quotation.getId());
    }

    public List<AuditEvent> getAuditHistory(Long id, UserPrincipal actor) {
        Quotation quotation = getVisibleTo(id, actor);
        if (actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Internal audit history is not customer-visible");
        }
        return auditEvents.findByQuotationIdOrderByCreatedAtAsc(quotation.getId());
    }

    /** Removes internal margin/risk data from a response object bound for a customer-role caller. Never persisted. */
    public Quotation sanitizeForCustomer(Quotation quotation, UserPrincipal actor) {
        if (actor.isCustomer()) {
            quotation.setGrossMargin(0);
            quotation.setMarginPercent(0);
            quotation.setRiskScore(0);
            for (QuotationLine line : quotation.getLines()) {
                line.setMargin(0);
            }
        }
        return quotation;
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

    private void startApprovalChain(Quotation quotation, List<String> chain) {
        approvalSteps.deleteByQuotationId(quotation.getId());
        for (int i = 0; i < chain.size(); i++) {
            ApprovalStep step = new ApprovalStep();
            step.setQuotationId(quotation.getId());
            step.setStepOrder(i);
            step.setName(chain.get(i));
            step.setStatus("PENDING");
            approvalSteps.save(step);
        }
    }

    private void assertApprover(String role) {
        if (!List.of("ADMIN", "SALES_MANAGER", "FINANCE").contains(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have approval authority");
        }
    }

    private void assertStepRole(String role, ApprovalStep step) {
        if ("ADMIN".equals(role)) return;
        String required = stepRole(step.getName());
        if (!required.equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This step requires " + step.getName() + " authority");
        }
    }

    private static String stepRole(String stepName) {
        if (stepName == null) return "SALES_MANAGER";
        String n = stepName.toLowerCase();
        if (n.contains("finance")) return "FINANCE";
        return "SALES_MANAGER";
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
