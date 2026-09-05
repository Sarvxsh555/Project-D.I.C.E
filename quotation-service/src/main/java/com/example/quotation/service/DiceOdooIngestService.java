package com.example.quotation.service;

import com.example.quotation.model.AuditEvent;
import com.example.quotation.model.PipelineStage;
import com.example.quotation.model.Quotation;
import com.example.quotation.repository.AuditEventRepository;
import com.example.quotation.repository.QuotationRepository;
import com.example.quotation.web.OdooWebhookRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Inbound Odoo/OEEG seam. D.I.C.E. decides what the event means; this class only
 * records it and optionally re-runs D.I.C.E. on the related quote.
 * Live Odoo JSON-RPC is never called from here unless dice.odoo.enabled=true
 * (outbound lives in OEEG, not in this engine).
 */
@Service
public class DiceOdooIngestService {

    public static final String[] SUPPORTED_EVENTS = {
            "stock.replenished",
            "account.payment_posted",
            "stock.picking_done",
            "sale.order_confirmed"
    };

    private final QuotationRepository quotations;
    private final AuditEventRepository auditEvents;
    private final DiceEngine diceEngine;
    private final boolean odooLiveEnabled;

    public DiceOdooIngestService(
            QuotationRepository quotations,
            AuditEventRepository auditEvents,
            DiceEngine diceEngine,
            @Value("${dice.odoo.enabled:false}") boolean odooLiveEnabled) {
        this.quotations = quotations;
        this.auditEvents = auditEvents;
        this.diceEngine = diceEngine;
        this.odooLiveEnabled = odooLiveEnabled;
    }

    public Map<String, Object> ingest(OdooWebhookRequest request) {
        if (request == null || request.event == null || request.event.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event is required");
        }

        String action = switch (request.event) {
            case "stock.replenished" -> "Prompt Consolidate Remaining Backorder if a split is waiting on this SKU";
            case "account.payment_posted" -> "Mark commercial document cash-received; D.I.C.E. does not post ledgers";
            case "stock.picking_done" -> "Advance fulfillment signal; D.I.C.E. records delivery promise progress";
            case "sale.order_confirmed" -> "Bind external SO id; D.I.C.E. does not re-price";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown OEEG event. Supported: stock.replenished, account.payment_posted, stock.picking_done, sale.order_confirmed");
        };

        DiceEngine.Decision decision = null;
        if (request.quotationId != null) {
            Quotation quote = quotations.findById(request.quotationId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quotation not found"));
            decision = diceEngine.evaluate(quote);
            quote.setRiskScore(decision.riskScore());
            quotations.save(quote);
            log(quote.getId(), "DICE", request.event + " → " + action + " | risk " + Math.round(decision.riskScore()));
        } else {
            log(null, "DICE", request.event + " → " + action + " (no quotationId)");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("engine", "D.I.C.E.");
        body.put("source", "oeeg");
        body.put("event", request.event);
        body.put("odooModel", request.odooModel);
        body.put("action", action);
        body.put("liveOdooRpc", odooLiveEnabled);
        body.put("note", odooLiveEnabled
                ? "DICE_ODOO_ENABLED=true — OEEG may also call live JSON-RPC"
                : "Live Odoo JSON-RPC disabled; OEEG emulates events only");
        if (decision != null) {
            body.put("riskScore", decision.riskScore());
            body.put("autoApprove", decision.autoApprove());
            body.put("requiredLevel", decision.requiredLevel());
            body.put("reasons", decision.reasons());
        }
        return body;
    }

    private void log(Long quotationId, String action, String reason) {
        if (quotationId == null) return;
        AuditEvent event = new AuditEvent();
        event.setQuotationId(quotationId);
        event.setUsername("system:oeeg");
        event.setAction(action);
        event.setReason(reason);
        event.setFromStage(PipelineStage.APPROVED.name());
        event.setToStage(PipelineStage.APPROVED.name());
        event.setCreatedAt(Instant.now());
        auditEvents.save(event);
    }
}
