package com.example.quotation.web;

import jakarta.validation.constraints.NotBlank;

public class ApprovalActionRequest {

    @NotBlank
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
