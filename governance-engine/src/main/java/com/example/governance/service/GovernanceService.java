package com.example.governance.service;

import com.example.governance.client.DiceDecisionDto;
import com.example.governance.client.GovernanceDataClient;
import com.example.governance.model.GovernanceEvaluation;
import com.example.governance.repository.GovernanceEvaluationRepository;
import com.example.governance.rules.RequiredLevel;
import com.example.governance.web.EvaluationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Governance previously re-implemented the scoring rules that D.I.C.E. already owned, so the
 * two could (and did) disagree about the same quote. There is now one brain: quotation-service
 * scores the quote, and this service is responsible for turning that decision into an approval
 * chain, persisting the evaluation, and serving the contract approval-engine depends on.
 */
@Service
public class GovernanceService {

    private final GovernanceDataClient dataClient;
    private final GovernanceEvaluationRepository evaluations;

    public GovernanceService(GovernanceDataClient dataClient, GovernanceEvaluationRepository evaluations) {
        this.dataClient = dataClient;
        this.evaluations = evaluations;
    }

    public EvaluationResponse evaluate(Long quotationId, String bearerToken) {
        DiceDecisionDto decision = dataClient.fetchDiceDecision(quotationId, bearerToken);
        if (decision == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "D.I.C.E. returned no decision");
        }

        double riskScore = clamp(decision.riskScore);
        RequiredLevel requiredLevel = parseLevel(decision.requiredLevel);
        boolean approvalRequired = !decision.autoApprove;

        // A quote that needs a human but carries no explicit level still routes to the manager.
        if (approvalRequired && requiredLevel == RequiredLevel.NONE) {
            requiredLevel = RequiredLevel.SALES_MANAGER;
        }
        if (!approvalRequired) {
            requiredLevel = RequiredLevel.NONE;
        }

        List<String> reasons = decision.reasons == null ? List.of() : decision.reasons;
        List<RequiredLevel> approvalChain = buildChain(requiredLevel);

        persist(quotationId, riskScore, approvalRequired, requiredLevel, reasons);

        return new EvaluationResponse(riskScore, approvalRequired, requiredLevel, approvalChain, reasons);
    }

    public List<GovernanceEvaluation> history(Long quotationId) {
        return evaluations.findByQuotationIdOrderByCreatedAtDesc(quotationId);
    }

    private static RequiredLevel parseLevel(String raw) {
        if (raw == null) return RequiredLevel.NONE;
        try {
            return RequiredLevel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return RequiredLevel.fromAdminLabel(raw);
        }
    }

    private static double clamp(double score) {
        return Math.max(0, Math.min(100, Math.round(score * 100.0) / 100.0));
    }

    private List<RequiredLevel> buildChain(RequiredLevel requiredLevel) {
        return switch (requiredLevel) {
            case FINANCE -> List.of(RequiredLevel.SALES_MANAGER, RequiredLevel.FINANCE);
            case SALES_MANAGER -> List.of(RequiredLevel.SALES_MANAGER);
            case NONE -> List.of();
        };
    }

    private void persist(Long quotationId, double riskScore, boolean approvalRequired,
                          RequiredLevel requiredLevel, List<String> reasons) {
        GovernanceEvaluation evaluation = new GovernanceEvaluation();
        evaluation.setQuotationId(quotationId);
        evaluation.setRiskScore(riskScore);
        evaluation.setApprovalRequired(approvalRequired);
        evaluation.setRequiredLevel(requiredLevel);
        evaluation.setReasons(reasons);
        evaluations.save(evaluation);
    }
}
