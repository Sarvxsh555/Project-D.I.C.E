package com.example.governance.controller;

import com.example.governance.model.GovernanceEvaluation;
import com.example.governance.service.GovernanceService;
import com.example.governance.web.EvaluationResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quotes")
public class GovernanceController {

    private final GovernanceService governanceService;

    public GovernanceController(GovernanceService governanceService) {
        this.governanceService = governanceService;
    }

    @PostMapping("/{id}/evaluate")
    public EvaluationResponse evaluate(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        return governanceService.evaluate(id, authHeader.replaceFirst("^Bearer ", ""));
    }

    @GetMapping("/{id}/evaluations")
    public List<GovernanceEvaluation> history(@PathVariable Long id) {
        return governanceService.history(id);
    }
}
