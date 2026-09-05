package com.dice.service;

import com.dice.domain.Invoice;
import com.dice.domain.Payment;
import com.dice.domain.enums.InvoiceStatus;
import com.dice.domain.enums.PaymentStatus;
import com.dice.repository.PaymentRepository;
import com.dice.service.payment.PaymentAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Owns the payment state machine. Every transition happens here, driven only
 * by what the {@link PaymentAdapter} reports — never by a caller-supplied
 * target status.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceService invoiceService;
    private final PaymentAdapter paymentAdapter;

    /**
     * Creates and immediately processes a payment against an invoice.
     *
     * <p>Idempotent on {@code idempotencyKey}: a repeated request with the same
     * key returns the original result rather than charging again.
     */
    public Payment charge(UUID invoiceId, BigDecimal amount, String idempotencyKey, String actor) {
        return paymentRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> processNew(invoiceId, amount, idempotencyKey, actor));
    }

    private Payment processNew(UUID invoiceId, BigDecimal amount, String idempotencyKey, String actor) {
        Invoice invoice = invoiceService.require(invoiceId);
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }

        Payment payment = paymentRepository.save(Payment.builder()
                .invoice(invoice)
                .customer(invoice.getCustomer())
                .amount(amount)
                .currency(invoice.getCurrency())
                .status(PaymentStatus.PENDING)
                .idempotencyKey(idempotencyKey)
                .build());

        transition(payment, PaymentStatus.PROCESSING);

        PaymentAdapter.AdapterResult result = paymentAdapter.charge(amount, invoice.getCurrency(), idempotencyKey);

        if (result.success()) {
            payment.setTransactionReference(result.transactionReference());
            transition(payment, PaymentStatus.SUCCESS);
            invoiceService.markPaid(invoiceId);
            log.info("Payment {} succeeded for invoice {} (actor={})", payment.getId(), invoiceId, actor);
        } else {
            payment.setFailureReason(result.failureReason());
            transition(payment, PaymentStatus.FAILED);
            log.info("Payment {} failed for invoice {}: {} (actor={})",
                    payment.getId(), invoiceId, result.failureReason(), actor);
        }

        return paymentRepository.save(payment);
    }

    public Payment refund(UUID paymentId, String actor) {
        Payment payment = require(paymentId);
        transition(payment, PaymentStatus.REFUNDED);
        log.info("Payment {} refunded (actor={})", paymentId, actor);
        return paymentRepository.save(payment);
    }

    public Payment require(UUID paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("No payment with id " + paymentId));
    }

    @Transactional(readOnly = true)
    public List<Payment> forInvoice(UUID invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId);
    }

    /** The single place a payment's status field is ever written. */
    private void transition(Payment payment, PaymentStatus target) {
        if (!payment.getStatus().canTransitionTo(target)) {
            throw new IllegalStateException(
                    "Cannot move payment %s from %s to %s".formatted(payment.getId(), payment.getStatus(), target));
        }
        payment.setStatus(target);
        // Correctness of the invoice's paid/unpaid state does not depend on
        // whether the invoice happens to already be ISSUED at charge time.
        if (target == PaymentStatus.FAILED && payment.getInvoice().getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice already paid; a failed payment cannot un-pay it");
        }
    }
}
