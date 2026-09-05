package com.example.dealengine.web;

import jakarta.validation.constraints.NotBlank;

public class ReasonRequest {
    @NotBlank
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
