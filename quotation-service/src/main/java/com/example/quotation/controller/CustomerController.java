package com.example.quotation.controller;

import com.example.quotation.model.Customer;
import com.example.quotation.repository.CustomerRepository;
import com.example.quotation.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repository;

    public CustomerController(CustomerRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Customer> list(Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        // Internal services (e.g. governance-engine's tier lookup) forward the acting user's
        // own bearer token rather than a separate service credential, so a CUSTOMER-role
        // caller must still get *a* usable response here - just scoped to their own record,
        // never the full directory.
        if (actor.isCustomer()) {
            if (actor.customerId() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This customer login is not linked to an account");
            }
            return repository.findById(actor.customerId()).map(List::of).orElse(List.of());
        }
        return repository.findAll();
    }

    @PostMapping
    public Customer create(@RequestBody Customer customer, Authentication authentication) {
        if (UserPrincipal.from(authentication).isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Customer accounts cannot create customer records");
        }
        return repository.save(customer);
    }
}
