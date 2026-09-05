package com.example.fulfillment.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Component
public class ExternalServicesClient {

    private final RestClient dealEngine;
    private final RestClient inventoryEngine;
    private final RestClient quotationService;

    public ExternalServicesClient(
            @Value("${app.deal-engine.base-url}") String dealEngineBaseUrl,
            @Value("${app.inventory-engine.base-url}") String inventoryEngineBaseUrl,
            @Value("${app.quotation-service.base-url}") String quotationServiceBaseUrl) {
        this.dealEngine = RestClient.builder().baseUrl(dealEngineBaseUrl).build();
        this.inventoryEngine = RestClient.builder().baseUrl(inventoryEngineBaseUrl).build();
        this.quotationService = RestClient.builder().baseUrl(quotationServiceBaseUrl).build();
    }

    public OrderDto fetchOrder(Long orderId, String bearerToken) {
        return dealEngine.get()
                .uri("/orders/{id}", orderId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "deal-engine: order not accessible");
                })
                .body(OrderDto.class);
    }

    public ProductDto fetchProduct(Long productId, String bearerToken) {
        List<ProductDto> all = quotationService.get()
                .uri("/products")
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<>() {});
        return all.stream().filter(p -> p.id.equals(productId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Product not found"));
    }

    public StockCheckDto checkStock(Long productId, String bearerToken) {
        return inventoryEngine.get()
                .uri("/inventory/stock/{productId}", productId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .body(StockCheckDto.class);
    }

    public ReservationResultDto reserveStock(String orderRef, Long productId, int quantity, String bearerToken) {
        return inventoryEngine.post()
                .uri("/inventory/reserve")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("orderRef", orderRef, "productId", productId, "quantity", quantity))
                .retrieve()
                .body(ReservationResultDto.class);
    }

    public ReservationResultDto.Reservation reserveExact(String orderRef, Long warehouseId, Long productId,
                                                           int quantity, String bearerToken) {
        return inventoryEngine.post()
                .uri("/inventory/reserve-exact")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("orderRef", orderRef, "warehouseId", warehouseId, "productId", productId, "quantity", quantity))
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "inventory-engine: override rejected - insufficient stock");
                })
                .body(ReservationResultDto.Reservation.class);
    }
}
