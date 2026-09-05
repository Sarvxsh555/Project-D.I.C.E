package com.example.quotation.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

public record UserPrincipal(String username, String role, Long customerId) {

    public static UserPrincipal from(Authentication authentication) {
        String role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .findFirst()
                .orElse("");
        Long customerId = null;
        if (authentication.getDetails() instanceof java.util.Map<?, ?> details) {
            Object raw = details.get("customerId");
            if (raw instanceof Number n && n.longValue() > 0) customerId = n.longValue();
        }
        return new UserPrincipal(authentication.getName(), role, customerId);
    }

    public boolean isCustomer() {
        return "CUSTOMER".equals(role);
    }

    public boolean canApprove() {
        return "ADMIN".equals(role) || "SALES_MANAGER".equals(role) || "FINANCE".equals(role);
    }
}
