package com.example.login.dto;

public class AuthResponse {

    private boolean success;
    private String message;
    private String accessToken;

    public AuthResponse(boolean success, String message, String accessToken) {
        this.success = success;
        this.message = message;
        this.accessToken = accessToken;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getAccessToken() {
        return accessToken;
    }
}
