package com.example.fulfillment.controller;

import com.example.fulfillment.model.FulfillmentPlan;
import com.example.fulfillment.service.FulfillmentService;
import com.example.fulfillment.web.OverrideRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fulfillment")
public class FulfillmentController {

    private final FulfillmentService fulfillmentService;

    public FulfillmentController(FulfillmentService fulfillmentService) {
        this.fulfillmentService = fulfillmentService;
    }

    @PostMapping("/orders/{orderId}/propose")
    public ResponseEntity<FulfillmentPlan> propose(@PathVariable Long orderId, @RequestHeader("Authorization") String auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fulfillmentService.proposePlan(orderId, bearer(auth)));
    }

    @GetMapping("/orders/{orderId}")
    public FulfillmentPlan getByOrder(@PathVariable Long orderId) {
        return fulfillmentService.getByOrder(orderId);
    }

    @GetMapping("/plans/{id}")
    public FulfillmentPlan get(@PathVariable Long id) {
        return fulfillmentService.getOrThrow(id);
    }

    @PostMapping("/plans/{id}/accept")
    public FulfillmentPlan accept(@PathVariable Long id, @RequestHeader("Authorization") String auth) {
        return fulfillmentService.acceptPlan(id, bearer(auth));
    }

    @PostMapping("/plans/{id}/override")
    public FulfillmentPlan override(@PathVariable Long id, @Valid @RequestBody OverrideRequest request,
                                     @RequestHeader("Authorization") String auth) {
        return fulfillmentService.overridePlan(id, request, bearer(auth));
    }

    private String bearer(String authHeader) {
        return authHeader.replaceFirst("^Bearer ", "");
    }
}
