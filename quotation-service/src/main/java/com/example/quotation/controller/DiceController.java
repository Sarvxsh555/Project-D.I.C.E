package com.example.quotation.controller;

import com.example.quotation.model.Quotation;
import com.example.quotation.security.UserPrincipal;
import com.example.quotation.service.DiceEngine;
import com.example.quotation.service.QuotationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
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
