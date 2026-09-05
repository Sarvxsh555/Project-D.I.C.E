package com.example.login.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpirationMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-expiration-minutes}") long accessExpirationMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMinutes = accessExpirationMinutes;
    }

    public String generateAccessToken(String username, String role) {
        return generateAccessToken(username, role, null);
    }

    public String generateAccessToken(String username, String role, Long customerId) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(accessExpirationMinutes * 60);
        var builder = Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim("role", role);
        if (customerId != null) {
            builder.claim("customerId", customerId);
        }
        return builder
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessExpirationMinutes() {
        return accessExpirationMinutes;
    }
}
