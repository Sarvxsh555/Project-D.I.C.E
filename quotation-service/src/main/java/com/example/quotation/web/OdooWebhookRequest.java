package com.example.quotation.web;

import java.util.Map;

public class OdooWebhookRequest {
    /** OEEG scenario id, e.g. stock.replenished */
    public String event;
    public String odooModel;
    public Long quotationId;
    public Long orderId;
    public Map<String, Object> payload;
}
