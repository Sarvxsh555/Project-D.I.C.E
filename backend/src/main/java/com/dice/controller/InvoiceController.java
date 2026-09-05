package com.dice.controller;

import com.dice.domain.Invoice;
import com.dice.domain.InvoiceLine;
import com.dice.domain.enums.InvoiceStatus;
import com.dice.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/api/deals/{dealId}/invoice")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public ResponseEntity<InvoiceView> generate(@PathVariable UUID dealId, Authentication authentication) {
        return invoiceService.generateOneTimeInvoice(dealId, DealController.actorOf(authentication))
                .map(invoice -> ResponseEntity.ok(InvoiceView.from(invoice)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/api/deals/{dealId}/invoices")
    public List<InvoiceView> forDeal(@PathVariable UUID dealId) {
        return invoiceService.forDeal(dealId).stream().map(InvoiceView::from).toList();
    }

    @GetMapping("/api/invoices/{id}")
    public InvoiceView get(@PathVariable UUID id) {
        return InvoiceView.from(invoiceService.require(id));
    }

    @PostMapping("/api/invoices/{id}/issue")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public InvoiceView issue(@PathVariable UUID id, Authentication authentication) {
        return InvoiceView.from(invoiceService.issue(id, DealController.actorOf(authentication)));
    }

    public record InvoiceLineView(String sku, String description, Integer quantity,
                                  BigDecimal unitPrice, BigDecimal amount) {
        static InvoiceLineView from(InvoiceLine line) {
            return new InvoiceLineView(line.getSku(), line.getDescription(), line.getQuantity(),
                    line.getUnitPrice(), line.getAmount());
        }
    }

    public record InvoiceView(UUID id, UUID dealId, UUID customerId, UUID subscriptionId,
                              InvoiceStatus status, String currency, BigDecimal totalAmount,
                              LocalDate dueDate, Instant issuedAt, Instant paidAt,
                              List<InvoiceLineView> lines) {
        static InvoiceView from(Invoice invoice) {
            return new InvoiceView(invoice.getId(), invoice.getDeal().getId(),
                    invoice.getCustomer().getId(),
                    invoice.getSubscription() != null ? invoice.getSubscription().getId() : null,
                    invoice.getStatus(), invoice.getCurrency(), invoice.getTotalAmount(),
                    invoice.getDueDate(), invoice.getIssuedAt(), invoice.getPaidAt(),
                    invoice.getLines().stream().map(InvoiceLineView::from).toList());
        }
    }
}
