package com.dice.oeeg.payload;

import java.util.Map;

/**
 * TODO: builds the {type, payload} envelope expected by
 * POST /api/webhooks/odoo (see backend OdooWebhookController).
 */
public class PayloadBuilder {

    public Map<String, Object> build(String type, Map<String, Object> fields) {
        throw new UnsupportedOperationException("TODO: implement payload assembly");
    }
}
