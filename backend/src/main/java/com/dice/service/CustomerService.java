package com.dice.service;

import com.dice.domain.Customer;
import com.dice.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;

    public List<Customer> findAll() {
        return customerRepository.findByActiveTrue();
    }

    public Customer require(UUID id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No customer with id " + id));
    }

    /**
     * Finds the customer behind an Odoo partner id, creating a placeholder if
     * the partner has not been synced yet. Keeps webhook handling from failing
     * on an unknown account.
     */
    @Transactional
    public Customer findOrCreateByOdooPartner(Long odooPartnerId, String name) {
        return customerRepository.findByOdooPartnerId(odooPartnerId)
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .odooPartnerId(odooPartnerId)
                        .name(name == null ? "Odoo partner " + odooPartnerId : name)
                        .segment(com.dice.domain.enums.CustomerSegment.SMB)
                        .creditLimit(java.math.BigDecimal.ZERO)
                        .outstandingBalance(java.math.BigDecimal.ZERO)
                        .paymentTermsDays(30)
                        .riskScore(50)
                        .active(true)
                        .build()));
    }
}
