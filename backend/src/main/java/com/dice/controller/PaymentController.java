package com.dice.controller;

import com.dice.domain.Payment;
import com.dice.domain.enums.PaymentStatus;
import com.dice.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Payment is created and processed as one authoritative server-side operation —
 * there is no endpoint that accepts a target status from the caller.
 */
@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/api/invoices/{invoiceId}/payments")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CUSTOMER')")
    public PaymentView charge(@PathVariable UUID invoiceId,
                              @Valid @RequestBody ChargeRequest request,
                              Authentication authentication) {
        Payment payment = paymentService.charge(invoiceId, request.amount(),
                request.idempotencyKey(), DealController.actorOf(authentication));
        return PaymentView.from(payment);
    }

    @GetMapping("/api/invoices/{invoiceId}/payments")
    public List<PaymentView> forInvoice(@PathVariable UUID invoiceId) {
        return paymentService.forInvoice(invoiceId).stream().map(PaymentView::from).toList();
    }

    @GetMapping("/api/payments/{id}")
    public PaymentView get(@PathVariable UUID id) {
        return PaymentView.from(paymentService.require(id));
    }

    @PostMapping("/api/payments/{id}/refund")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public PaymentView refund(@PathVariable UUID id, Authentication authentication) {
        return PaymentView.from(paymentService.refund(id, DealController.actorOf(authentication)));
    }

    public record ChargeRequest(
            @NotNull @Positive BigDecimal amount,
            @NotBlank String idempotencyKey) {
    }

    public record PaymentView(UUID id, UUID invoiceId, PaymentStatus status, BigDecimal amount,
                              String currency, String transactionReference, String failureReason,
                              Instant createdAt, Instant updatedAt) {
        static PaymentView from(Payment payment) {
            return new PaymentView(payment.getId(), payment.getInvoice().getId(), payment.getStatus(),
                    payment.getAmount(), payment.getCurrency(), payment.getTransactionReference(),
                    payment.getFailureReason(), payment.getCreatedAt(), payment.getUpdatedAt());
        }
    }
}
