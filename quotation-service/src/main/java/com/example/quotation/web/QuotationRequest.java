package com.example.quotation.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class QuotationRequest {

    @NotNull
    private Long customerId;

    @NotEmpty
    @Valid
    private List<QuotationLineRequest> lines;

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public List<QuotationLineRequest> getLines() { return lines; }
    public void setLines(List<QuotationLineRequest> lines) { this.lines = lines; }
}
