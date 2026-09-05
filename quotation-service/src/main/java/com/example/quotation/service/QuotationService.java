package com.example.quotation.service;

import com.example.quotation.model.*;
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

    private final QuotationRepository quotations;
    private final CustomerRepository customers;
    private final ProductRepository products;
    private final CustomerPriceRepository customerPrices;
    private final AtomicInteger quoteSequence = new AtomicInteger(1000);

    public QuotationService(QuotationRepository quotations, CustomerRepository customers,
                             ProductRepository products, CustomerPriceRepository customerPrices) {
        this.quotations = quotations;
        this.customers = customers;
        this.products = products;
        this.customerPrices = customerPrices;
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

    public Quotation transition(Long id, PipelineStage toStage) {
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
        } else if (toStage == PipelineStage.APPROVED) {
            quotation.setApprovalStatus("APPROVED");
        } else if (toStage == PipelineStage.DRAFT) {
            quotation.setApprovalStatus("NOT_REQUIRED");
        }
        quotation.setUpdatedAt(Instant.now());
        return quotations.save(quotation);
    }

    public Quotation getOrThrow(Long id) {
        return quotations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
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
