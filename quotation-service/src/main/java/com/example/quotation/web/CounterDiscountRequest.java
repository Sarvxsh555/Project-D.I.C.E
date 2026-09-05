package com.example.quotation.web;

import jakarta.validation.constraints.NotNull;

public class CounterDiscountRequest {
    @NotNull
    private Long lineId;

    private double proposedDiscountPercent;

    private String reason;

    public Long getLineId() { return lineId; }
    public void setLineId(Long lineId) { this.lineId = lineId; }
    public double getProposedDiscountPercent() { return proposedDiscountPercent; }
    public void setProposedDiscountPercent(double proposedDiscountPercent) { this.proposedDiscountPercent = proposedDiscountPercent; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
