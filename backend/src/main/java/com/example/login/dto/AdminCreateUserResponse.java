package com.example.login.dto;

public record AdminCreateUserResponse(Long id, String username, String email, String role, Long customerId, String generatedPassword) {
}
