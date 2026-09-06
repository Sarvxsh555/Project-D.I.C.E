package com.example.governance.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** The decision D.I.C.E. (quotation-service) returns for one quote. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class DiceDecisionDto {
    public double riskScore;
    public boolean autoApprove;
    public String band;
    public String requiredLevel;
    public List<String> reasons;
}
