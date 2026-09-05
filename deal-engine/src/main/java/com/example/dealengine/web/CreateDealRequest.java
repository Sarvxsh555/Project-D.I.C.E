package com.example.dealengine.web;

import jakarta.validation.constraints.NotNull;

public class CreateDealRequest {
    @NotNull
    private Long quotationId;

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }
}
