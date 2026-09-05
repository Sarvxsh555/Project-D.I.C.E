package com.dice.controller;

import com.dice.domain.Customer;
import com.dice.domain.enums.CustomerSegment;
import com.dice.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Read-only customer catalogue.
 *
 * <p>Not part of the original module plan, but nothing else exposed one — any
 * "create a deal" UI needs to pick a customer from somewhere, and OEEG needed
 * a real way to look one up rather than reaching into MySQL directly. Kept
 * deliberately thin: list + get, mirroring {@link DealController}'s DTO style.
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public List<CustomerSummary> list() {
        return customerService.findAll().stream().map(CustomerSummary::from).toList();
    }

    @GetMapping("/{id}")
    public CustomerSummary get(@PathVariable UUID id) {
        return CustomerSummary.from(customerService.require(id));
    }

    public record CustomerSummary(
            UUID id, String name, CustomerSegment segment, String tier, String region,
            BigDecimal creditLimit, BigDecimal availableCredit, Integer paymentTermsDays,
            BigDecimal creditUsed, String paymentTerms, Integer riskScore) {

        static CustomerSummary from(Customer customer) {
            return new CustomerSummary(customer.getId(), customer.getName(), customer.getSegment(),
                    customer.getTier(), customer.getRegion(), customer.getCreditLimit(),
                    customer.availableCredit(), customer.getPaymentTermsDays(),
                    customer.getOutstandingBalance() != null ? customer.getOutstandingBalance() : BigDecimal.ZERO,
                    "Net " + (customer.getPaymentTermsDays() != null ? customer.getPaymentTermsDays() : 30),
                    customer.getRiskScore() != null ? customer.getRiskScore() : 20);
        }
    }
}
