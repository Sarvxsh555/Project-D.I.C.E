package com.example.governance.service;

import com.example.governance.client.CustomerDto;
import com.example.governance.client.GovernanceDataClient;
import com.example.governance.client.ProductDto;
import com.example.governance.client.QuoteDto;
import com.example.governance.model.GovernanceEvaluation;
import com.example.governance.repository.GovernanceEvaluationRepository;
import com.example.governance.rules.*;
import com.example.governance.web.EvaluationResponse;
import org.jeasy.rules.api.Facts;
import org.jeasy.rules.api.Rules;
import org.jeasy.rules.api.RulesEngine;
import org.jeasy.rules.core.DefaultRulesEngine;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GovernanceService {

    /** Risk score at/above this line always requires approval, even if no single rule fired. */
    private static final double RISK_APPROVAL_THRESHOLD = 40.0;

    private final GovernanceDataClient dataClient;
    private final GovernanceEvaluationRepository evaluations;
    private final RulesEngine rulesEngine = new DefaultRulesEngine();

    public GovernanceService(GovernanceDataClient dataClient, GovernanceEvaluationRepository evaluations) {
        this.dataClient = dataClient;
        this.evaluations = evaluations;
    }

    public EvaluationResponse evaluate(Long quotationId, String bearerToken) {
        QuoteDto quote = dataClient.fetchQuote(quotationId, bearerToken);
        if (quote.lines == null || quote.lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quote has no line items to evaluate");
        }

        List<CustomerDto> customers = dataClient.fetchCustomers(bearerToken);
        String customerTier = customers.stream()
                .filter(c -> c.id.equals(quote.customerId))
                .map(c -> c.tier)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        List<ProductDto> products = dataClient.fetchProducts(bearerToken);
        Map<Long, String> categoryById = products.stream()
                .collect(Collectors.toMap(p -> p.id, p -> p.category, (a, b) -> a));

        List<com.example.governance.client.DiscountRuleDto> discountRules = dataClient.fetchDiscountRules(bearerToken);

        GovernanceContext ctx = new GovernanceContext(quote, customerTier, categoryById, discountRules);
        runRules(ctx);

        double riskScore = ctx.clampedRiskScore();
        boolean approvalRequired = ctx.requiredLevel != RequiredLevel.NONE || riskScore >= RISK_APPROVAL_THRESHOLD;
        RequiredLevel requiredLevel = approvalRequired
                ? RequiredLevel.highestOf(ctx.requiredLevel, RequiredLevel.SALES_MANAGER)
                : RequiredLevel.NONE;

        List<RequiredLevel> approvalChain = buildChain(requiredLevel);

        persist(quotationId, riskScore, approvalRequired, requiredLevel, ctx.reasons);

        return new EvaluationResponse(riskScore, approvalRequired, requiredLevel, approvalChain, ctx.reasons);
    }

    public List<GovernanceEvaluation> history(Long quotationId) {
        return evaluations.findByQuotationIdOrderByCreatedAtDesc(quotationId);
    }

    private void runRules(GovernanceContext ctx) {
        Rules rules = new Rules();
        rules.register(new BaselineDiscountRiskRule());
        rules.register(new DiscountCeilingRule());
        rules.register(new MarginFloorRule());
        rules.register(new DealValueRule());

        Facts facts = new Facts();
        facts.put("ctx", ctx);
        rulesEngine.fire(rules, facts);
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
