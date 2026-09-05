package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.domain.enums.BillingStatus;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final DealRepository dealRepository;

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String status) {
        return dealRepository.findAll().stream()
                .map(this::mapDealToInvoice)
                .filter(inv -> status == null || status.isBlank() || status.equalsIgnoreCase((String) inv.get("status")))
                .toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        return mapDealToInvoice(deal);
    }

    @PostMapping("/{id}/issue")
    public Map<String, Object> issue(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        deal.setBillingStatus(BillingStatus.INVOICED);
        dealRepository.save(deal);
        return mapDealToInvoice(deal);
    }

    @PostMapping("/{id}/mark-paid")
    public Map<String, Object> markPaid(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        deal.setBillingStatus(BillingStatus.PAID);
        dealRepository.save(deal);
        return mapDealToInvoice(deal);
    }

    @PostMapping("/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable String id) {
        Deal deal = resolveDeal(id);
        deal.setBillingStatus(BillingStatus.NOT_INVOICED);
        dealRepository.save(deal);
        return mapDealToInvoice(deal);
    }

    private Map<String, Object> mapDealToInvoice(Deal deal) {
        Map<String, Object> inv = new LinkedHashMap<>();
        String invNum = "INV-" + deal.getDealNumber();
        inv.put("id", invNum);
        inv.put("invoiceNumber", invNum);
        inv.put("dealId", deal.getId());
        inv.put("dealNumber", deal.getDealNumber());
        inv.put("customerName", deal.getCustomer().getName());
        inv.put("amount", deal.getTotalAmount());
        inv.put("subtotal", deal.getSubtotal());
        inv.put("discount", deal.getDiscountAmount());
        inv.put("tax", BigDecimal.ZERO);
        inv.put("total", deal.getTotalAmount());
        inv.put("currency", deal.getCurrency() != null ? deal.getCurrency() : "USD");
        inv.put("issueDate", deal.getCreatedAt() != null ? deal.getCreatedAt().toString().substring(0, 10) : LocalDate.now().toString());
        inv.put("issuedDate", deal.getCreatedAt() != null ? deal.getCreatedAt().toString().substring(0, 10) : LocalDate.now().toString());
        inv.put("dueDate", deal.getRequestedDeliveryDate() != null ? deal.getRequestedDeliveryDate().toString() : LocalDate.now().plusDays(30).toString());
        
        String status = "DRAFT";
        if (deal.getBillingStatus() == BillingStatus.PAID) {
            status = "PAID";
            inv.put("paidDate", LocalDate.now().toString());
        } else if (deal.getBillingStatus() == BillingStatus.INVOICED) {
            status = "ISSUED";
        }
        inv.put("status", status);

        List<Map<String, Object>> lines = deal.getLines().stream().map(l -> {
            Map<String, Object> lineMap = new LinkedHashMap<>();
            lineMap.put("description", l.getProduct().getName());
            lineMap.put("quantity", l.getQuantity());
            lineMap.put("unitPrice", l.getUnitPrice());
            lineMap.put("total", l.getLineTotal());
            return lineMap;
        }).toList();
        inv.put("lines", lines);
        return inv;
    }

    private Deal resolveDeal(String idOrNumber) {
        String clean = idOrNumber.replace("INV-", "").trim();
        try {
            UUID id = UUID.fromString(clean);
            return dealRepository.findWithLinesById(id)
                    .orElseGet(() -> dealRepository.findByDealNumber(clean)
                            .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                                    .orElseThrow(() -> new IllegalArgumentException("No invoice for: " + idOrNumber))));
        } catch (IllegalArgumentException e) {
            return dealRepository.findByDealNumber(clean)
                    .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("No invoice for: " + idOrNumber)));
        }
    }
}
