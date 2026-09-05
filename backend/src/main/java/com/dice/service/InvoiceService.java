package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Invoice;
import com.dice.domain.InvoiceLine;
import com.dice.domain.Subscription;
import com.dice.domain.SubscriptionPlan;
import com.dice.domain.enums.BillingMode;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.InvoiceStatus;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Produces {@link Invoice}s — billing output, never a second order.
 *
 * <p>ONE_TIME deal lines are billed once, off confirmed sales-order state.
 * RECURRING lines are billed per cycle through {@code SubscriptionService};
 * see {@link #generateRecurringInvoice}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InvoiceService {

    /** Only these statuses represent authoritative, confirmed sales-order state. */
    private static final Set<DealStatus> BILLABLE_STATUSES = Set.of(
            DealStatus.CONFIRMED, DealStatus.FULFILLING, DealStatus.FULFILLED, DealStatus.INVOICED);

    private final DealRepository dealRepository;
    private final InvoiceRepository invoiceRepository;
    private final EventPublisher eventPublisher;

    /**
     * Generates the one-time invoice for a confirmed deal's ONE_TIME lines.
     * Draft/pending/in-negotiation deals are rejected — never trust anything
     * short of authoritative confirmed state.
     */
    public Optional<Invoice> generateOneTimeInvoice(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);

        if (!BILLABLE_STATUSES.contains(deal.getStatus())) {
            throw new IllegalStateException(
                    "Deal %s is %s; only confirmed orders can be invoiced"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }

        List<DealLine> oneTimeLines = deal.getLines().stream()
                .filter(line -> line.getBillingMode() == BillingMode.ONE_TIME)
                .toList();
        if (oneTimeLines.isEmpty()) {
            return Optional.empty();
        }

        boolean alreadyInvoiced = invoiceRepository.findByDealId(dealId).stream()
                .anyMatch(invoice -> invoice.getSubscription() == null
                        && invoice.getStatus() != InvoiceStatus.VOID);
        if (alreadyInvoiced) {
            throw new IllegalStateException(
                    "Deal %s already has a one-time invoice".formatted(deal.getDealNumber()));
        }

        Invoice invoice = Invoice.builder()
                .deal(deal)
                .customer(deal.getCustomer())
                .currency(deal.getCurrency())
                .status(InvoiceStatus.DRAFT)
                .dueDate(dueDate(deal))
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (DealLine line : oneTimeLines) {
            BigDecimal amount = line.netUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            invoice.addLine(InvoiceLine.builder()
                    .sku(line.getProduct().getSku())
                    .description(line.getProduct().getName())
                    .quantity(line.getQuantity())
                    .unitPrice(line.netUnitPrice())
                    .amount(amount)
                    .build());
            total = total.add(amount);
        }
        invoice.setTotalAmount(total);

        Invoice saved = invoiceRepository.save(invoice);

        eventPublisher.publish(DealEvent.Type.INVOICE_DRAFTED, dealId, actor,
                Map.of("invoiceId", saved.getId(), "totalAmount", total));

        return Optional.of(saved);
    }

    /** One invoice per recurring billing cycle; the subscription drives cadence, not this call. */
    public Invoice generateRecurringInvoice(Subscription subscription, String actor) {
        SubscriptionPlan plan = subscription.getPlan();
        BigDecimal amount = plan.getPrice().setScale(2, RoundingMode.HALF_UP);

        Invoice invoice = Invoice.builder()
                .deal(subscription.getDeal())
                .customer(subscription.getCustomer())
                .subscription(subscription)
                .currency(plan.getCurrency())
                .status(InvoiceStatus.DRAFT)
                .dueDate(subscription.getNextBillingDate())
                .totalAmount(amount)
                .build();

        invoice.addLine(InvoiceLine.builder()
                .sku(plan.getProduct() != null ? plan.getProduct().getSku() : null)
                .description(plan.getName() + " (" + plan.getInterval() + ")")
                .quantity(1)
                .unitPrice(amount)
                .amount(amount)
                .build());

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Generated recurring invoice {} for subscription {} (actor={})",
                saved.getId(), subscription.getId(), actor);
        return saved;
    }

    public Invoice issue(UUID invoiceId, String actor) {
        Invoice invoice = require(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Invoice %s is %s, not DRAFT".formatted(invoiceId, invoice.getStatus()));
        }
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setIssuedAt(java.time.Instant.now());
        return invoiceRepository.save(invoice);
    }

    /** Called only by {@code PaymentService} once a payment actually succeeds. */
    public Invoice markPaid(UUID invoiceId) {
        Invoice invoice = require(invoiceId);
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(java.time.Instant.now());
        return invoiceRepository.save(invoice);
    }

    public Invoice require(UUID invoiceId) {
        return invoiceRepository.findWithLinesById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("No invoice with id " + invoiceId));
    }

    @Transactional(readOnly = true)
    public List<Invoice> forDeal(UUID dealId) {
        return invoiceRepository.findByDealId(dealId);
    }

    /** The cross-deal ledger view. {@code status} null means every invoice. */
    @Transactional(readOnly = true)
    public List<Invoice> list(InvoiceStatus status) {
        return status == null
                ? invoiceRepository.findAllWithLines()
                : invoiceRepository.findByStatus(status);
    }

    private Deal requireDeal(UUID dealId) {
        return dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
    }

    private LocalDate dueDate(Deal deal) {
        Integer termsDays = deal.getCustomer().getPaymentTermsDays();
        return LocalDate.now().plusDays(termsDays == null ? 30 : termsDays);
    }
}
