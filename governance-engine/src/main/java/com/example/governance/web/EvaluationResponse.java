package com.example.governance.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.example.governance.rules.RequiredLevel;

import java.util.List;

public class EvaluationResponse {

    @JsonProperty("risk_score")
    public final double riskScore;

    @JsonProperty("approval_required")
    public final boolean approvalRequired;

    @JsonProperty("required_level")
    public final RequiredLevel requiredLevel;

    @JsonProperty("approval_chain")
    public final List<RequiredLevel> approvalChain;

    @JsonProperty("reasons")
    public final List<String> reasons;

    public EvaluationResponse(double riskScore, boolean approvalRequired, RequiredLevel requiredLevel,
                               List<RequiredLevel> approvalChain, List<String> reasons) {
        this.riskScore = riskScore;
        this.approvalRequired = approvalRequired;
        this.requiredLevel = requiredLevel;
        this.approvalChain = approvalChain;
        this.reasons = reasons;
    }
}
