package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Invoice;
import com.dice.domain.Product;
import com.dice.domain.enums.BillingMode;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.InvoiceStatus;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock private DealRepository dealRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private EventPublisher eventPublisher;

    private InvoiceService service;
    private Deal deal;

    @BeforeEach
    void setUp() {
        service = new InvoiceService(dealRepository, invoiceRepository, eventPublisher);

        Customer customer = Customer.builder().id(UUID.randomUUID()).name("Acme").paymentTermsDays(30).build();
        deal = Deal.builder().id(UUID.randomUUID()).dealNumber("DICE-000001").customer(customer)
                .currency("USD").status(DealStatus.CONFIRMED).lines(new ArrayList<>()).build();

        lenient().when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> {
            Invoice i = inv.getArgument(0);
            if (i.getId() == null) i.setId(UUID.randomUUID());
            return i;
        });
    }

    private DealLine line(BillingMode mode, int qty, String unitPrice) {
        Product product = Product.builder().id(UUID.randomUUID()).sku("SKU-1").name("Widget")
                .listPrice(new BigDecimal(unitPrice)).standardCost(BigDecimal.TEN).build();
        DealLine line = DealLine.builder().id(UUID.randomUUID()).deal(deal).product(product)
                .quantity(qty).unitPrice(new BigDecimal(unitPrice)).discountPercent(BigDecimal.ZERO)
                .billingMode(mode).build();
        deal.getLines().add(line);
        return line;
    }

    @Test
    void draftDealCannotBeInvoiced() {
        deal.setStatus(DealStatus.DRAFT);
        line(BillingMode.ONE_TIME, 1, "100");
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));

        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.generateOneTimeInvoice(deal.getId(), "finance1")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void confirmedDealWithOneTimeLinesGeneratesInvoice() {
        line(BillingMode.ONE_TIME, 2, "100");
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));
        when(invoiceRepository.findByDealId(deal.getId())).thenReturn(List.of());

        Optional<Invoice> result = service.generateOneTimeInvoice(deal.getId(), "finance1");

        assertThat(result).isPresent();
        assertThat(result.get().getTotalAmount()).isEqualByComparingTo("200.00");
        assertThat(result.get().getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(result.get().getLines()).hasSize(1);
    }

    @Test
    void recurringOnlyDealProducesNoOneTimeInvoice() {
        line(BillingMode.RECURRING, 1, "100");
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));

        Optional<Invoice> result = service.generateOneTimeInvoice(deal.getId(), "finance1");

        assertThat(result).isEmpty();
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void mixedDealOnlyBillsOneTimeLines() {
        line(BillingMode.ONE_TIME, 1, "100");
        line(BillingMode.RECURRING, 1, "50");
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));
        when(invoiceRepository.findByDealId(deal.getId())).thenReturn(List.of());

        Optional<Invoice> result = service.generateOneTimeInvoice(deal.getId(), "finance1");

        assertThat(result).isPresent();
        assertThat(result.get().getTotalAmount()).isEqualByComparingTo("100.00");
        assertThat(result.get().getLines()).hasSize(1);
    }

    @Test
    void duplicateOneTimeInvoiceIsRejected() {
        line(BillingMode.ONE_TIME, 1, "100");
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));
        Invoice existing = Invoice.builder().id(UUID.randomUUID()).status(InvoiceStatus.ISSUED).build();
        when(invoiceRepository.findByDealId(deal.getId())).thenReturn(List.of(existing));

        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.generateOneTimeInvoice(deal.getId(), "finance1")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void issueMovesDraftToIssued() {
        Invoice invoice = Invoice.builder().id(UUID.randomUUID()).status(InvoiceStatus.DRAFT)
                .lines(new ArrayList<>()).build();
        when(invoiceRepository.findWithLinesById(invoice.getId())).thenReturn(Optional.of(invoice));

        Invoice issued = service.issue(invoice.getId(), "finance1");

        assertThat(issued.getStatus()).isEqualTo(InvoiceStatus.ISSUED);
        assertThat(issued.getIssuedAt()).isNotNull();
    }
}
