package com.example.login.dto;

import com.example.login.model.User;

public record UserSummary(Long id, String username, String email, String role, Long customerId) {
    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), user.getCustomerId());
    }
}
