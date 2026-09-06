package com.example.dealengine.controller;

import com.example.dealengine.model.Order;
import com.example.dealengine.security.UserPrincipal;
import com.example.dealengine.service.DealService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final DealService dealService;

    public OrderController(DealService dealService) {
        this.dealService = dealService;
    }

    @GetMapping
    public List<Order> listMine(Authentication authentication) {
        return dealService.listMine(UserPrincipal.from(authentication));
    }

    @GetMapping("/{id}")
    public Order get(@PathVariable Long id, Authentication authentication) {
        return dealService.getOrderVisibleTo(id, UserPrincipal.from(authentication));
    }
}
