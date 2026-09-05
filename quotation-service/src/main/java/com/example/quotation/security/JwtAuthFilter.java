package com.example.quotation.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Trusts access tokens minted by the login-service (same HMAC secret) - this service
 * never issues or refreshes tokens itself, it only verifies them.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtVerifier jwtVerifier;

    public JwtAuthFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtVerifier.parseClaims(header.substring(7));
                String username = claims.getSubject();
                String role = claims.get("role", String.class);
                Object rawCustomerId = claims.get("customerId");
                Long customerId = rawCustomerId instanceof Number n ? n.longValue() : null;
                var authorities = role != null
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        : List.<SimpleGrantedAuthority>of();
                var authentication = new UsernamePasswordAuthenticationToken(username, null, authorities);
                authentication.setDetails(java.util.Map.of(
                        "role", role != null ? role : "",
                        "customerId", customerId != null ? customerId : -1L));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException ignored) {
                // invalid/expired token -> leave unauthenticated, entry point handles the 401
            }
        }

        filterChain.doFilter(request, response);
    }
}
