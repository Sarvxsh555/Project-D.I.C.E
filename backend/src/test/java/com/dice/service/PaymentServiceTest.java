package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.Invoice;
import com.dice.domain.Payment;
import com.dice.domain.enums.InvoiceStatus;
import com.dice.domain.enums.PaymentStatus;
import com.dice.repository.PaymentRepository;
import com.dice.service.payment.PaymentAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private InvoiceService invoiceService;
    @Mock private PaymentAdapter paymentAdapter;

    private PaymentService service;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        service = new PaymentService(paymentRepository, invoiceService, paymentAdapter);

        Customer customer = Customer.builder().id(UUID.randomUUID()).name("Acme").build();
        invoice = Invoice.builder().id(UUID.randomUUID()).customer(customer)
                .currency("USD").status(InvoiceStatus.ISSUED).totalAmount(BigDecimal.valueOf(500)).build();

        lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
    }

    @Test
    void successfulChargeMovesInvoiceToPaid() {
        when(paymentRepository.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());
        when(invoiceService.require(invoice.getId())).thenReturn(invoice);
        when(paymentAdapter.charge(BigDecimal.valueOf(500), "USD", "key-1"))
                .thenReturn(PaymentAdapter.AdapterResult.success("TXN-1"));

        Payment payment = service.charge(invoice.getId(), BigDecimal.valueOf(500), "key-1", "rep1");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getTransactionReference()).isEqualTo("TXN-1");
        verify(invoiceService).markPaid(invoice.getId());
    }

    @Test
    void failedChargeLeavesInvoiceUnpaid() {
        when(paymentRepository.findByIdempotencyKey("key-2")).thenReturn(Optional.empty());
        when(invoiceService.require(invoice.getId())).thenReturn(invoice);
        when(paymentAdapter.charge(any(), any(), any()))
                .thenReturn(PaymentAdapter.AdapterResult.failure("card declined"));

        Payment payment = service.charge(invoice.getId(), BigDecimal.valueOf(500), "key-2", "rep1");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(payment.getFailureReason()).isEqualTo("card declined");
        verify(invoiceService, never()).markPaid(any());
    }

    @Test
    void duplicateIdempotencyKeyDoesNotChargeAgain() {
        Payment existing = Payment.builder().id(UUID.randomUUID()).invoice(invoice)
                .amount(BigDecimal.valueOf(500)).status(PaymentStatus.SUCCESS)
                .idempotencyKey("key-3").build();
        when(paymentRepository.findByIdempotencyKey("key-3")).thenReturn(Optional.of(existing));

        Payment result = service.charge(invoice.getId(), BigDecimal.valueOf(500), "key-3", "rep1");

        assertThat(result).isSameAs(existing);
        verifyNoInteractions(paymentAdapter);
        verify(invoiceService, never()).require(any());
    }

    @Test
    void nonPositiveAmountIsRejected() {
        when(paymentRepository.findByIdempotencyKey("key-4")).thenReturn(Optional.empty());
        when(invoiceService.require(invoice.getId())).thenReturn(invoice);

        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.charge(invoice.getId(), BigDecimal.ZERO, "key-4", "rep1")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refundOnlyValidFromSuccess() {
        Payment success = Payment.builder().id(UUID.randomUUID()).invoice(invoice)
                .amount(BigDecimal.valueOf(500)).status(PaymentStatus.SUCCESS).idempotencyKey("key-5").build();
        when(paymentRepository.findById(success.getId())).thenReturn(Optional.of(success));

        Payment refunded = service.refund(success.getId(), "finance1");

        assertThat(refunded.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void refundFromPendingIsRejected() {
        Payment pending = Payment.builder().id(UUID.randomUUID()).invoice(invoice)
                .amount(BigDecimal.valueOf(500)).status(PaymentStatus.PENDING).idempotencyKey("key-6").build();
        when(paymentRepository.findById(pending.getId())).thenReturn(Optional.of(pending));

        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.refund(pending.getId(), "finance1")))
                .isInstanceOf(IllegalStateException.class);
    }
}
