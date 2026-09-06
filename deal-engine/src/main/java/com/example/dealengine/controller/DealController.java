package com.example.dealengine.controller;

import com.example.dealengine.model.Deal;
import com.example.dealengine.model.Order;
import com.example.dealengine.model.QuoteVersion;
import com.example.dealengine.security.UserPrincipal;
import com.example.dealengine.service.DealService;
import com.example.dealengine.web.CreateDealRequest;
import com.example.dealengine.web.ReasonRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealService dealService;

    public DealController(DealService dealService) {
        this.dealService = dealService;
    }

    @GetMapping
    public List<Deal> list(Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        if (actor.isCustomer()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Customers cannot list all deals");
        }
        return dealService.list();
    }

    @GetMapping("/{id}")
    public Deal get(@PathVariable Long id, Authentication authentication) {
        return dealService.getDealVisibleTo(id, UserPrincipal.from(authentication));
    }

    @PostMapping
    public ResponseEntity<Deal> create(@Valid @RequestBody CreateDealRequest request,
                                        @RequestHeader("Authorization") String authHeader,
                                        Authentication authentication) {
        Deal created = dealService.createDeal(request.getQuotationId(), bearer(authHeader), authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/snapshot")
    public QuoteVersion snapshot(@PathVariable Long id, @Valid @RequestBody ReasonRequest request,
                                  @RequestHeader("Authorization") String authHeader) {
        return dealService.snapshot(id, bearer(authHeader), request.getReason());
    }

    @GetMapping("/{id}/versions")
    public List<QuoteVersion> versions(@PathVariable Long id, Authentication authentication) {
        return dealService.getVersions(id, UserPrincipal.from(authentication));
    }

    @PostMapping("/{id}/lost")
    public Deal markLost(@PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return dealService.markLost(id, request.getReason());
    }

    @PostMapping("/{id}/convert-to-order")
    public Order convertToOrder(@PathVariable Long id, @RequestHeader("Authorization") String authHeader,
                                 Authentication authentication) {
        return dealService.convertToOrder(id, bearer(authHeader), authentication.getName());
    }

    @GetMapping("/{id}/orders")
    public List<Order> ordersForDeal(@PathVariable Long id, Authentication authentication) {
        return dealService.getOrdersForDeal(id, UserPrincipal.from(authentication));
    }

    private String bearer(String authHeader) {
        return authHeader.replaceFirst("^Bearer ", "");
    }
}
