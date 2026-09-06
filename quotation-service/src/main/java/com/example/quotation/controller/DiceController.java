package com.example.quotation.controller;

import com.example.quotation.model.Quotation;
import com.example.quotation.security.UserPrincipal;
import com.example.quotation.service.DiceEngine;
import com.example.quotation.service.QuotationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dice")
public class DiceController {

    private final QuotationService quotationService;
    private final DiceEngine diceEngine;

    public DiceController(QuotationService quotationService, DiceEngine diceEngine) {
        this.quotationService = quotationService;
        this.diceEngine = diceEngine;
    }

    /**
     * Decisions for a batch of quotes in one call, so a reviewer's queue can show *why* each
     * row is waiting without issuing one request per row. Quotes the caller cannot see are
     * skipped rather than failing the whole batch.
     */
    @GetMapping("/decisions")
    public Map<String, Object> decisions(@RequestParam List<Long> ids, Authentication authentication) {
        UserPrincipal actor = UserPrincipal.from(authentication);
        Map<String, Object> out = new LinkedHashMap<>();
        for (Long id : ids) {
            try {
                Quotation quote = quotationService.getVisibleTo(id, actor);
                DiceEngine.Decision d = diceEngine.evaluate(quote);
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("riskScore", d.riskScore());
                entry.put("autoApprove", d.autoApprove());
                entry.put("band", d.band());
                entry.put("requiredLevel", d.requiredLevel());
                entry.put("reasons", d.reasons());
                entry.put("reasonCodes", d.reasons().stream().map(DiceController::codeOf).distinct().toList());
                out.put(String.valueOf(id), entry);
            } catch (RuntimeException ignored) {
                // Not visible to this user, or no longer evaluable - omit it from the batch.
            }
        }
        return out;
    }

    /** "MARGIN_FLOOR: gross margin ..." -> "MARGIN_FLOOR". */
    private static String codeOf(String reason) {
        int colon = reason.indexOf(':');
        return colon > 0 ? reason.substring(0, colon).trim() : reason;
    }

    @GetMapping("/quotes/{id}/decision")
    public Map<String, Object> decision(@PathVariable Long id, Authentication authentication) {
        Quotation quote = quotationService.getVisibleTo(id, UserPrincipal.from(authentication));
        DiceEngine.Decision d = diceEngine.evaluate(quote);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("engine", "D.I.C.E.");
        body.put("quotationId", id);
        body.put("riskScore", d.riskScore());
        body.put("autoApprove", d.autoApprove());
        body.put("band", d.band());
        body.put("requiredLevel", d.requiredLevel());
        body.put("chain", d.chain());
        body.put("reasons", d.reasons());
        return body;
    }
}
