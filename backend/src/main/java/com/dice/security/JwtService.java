package com.dice.security;

import com.dice.config.DiceProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

/** Issues and verifies the HS256 tokens the SPA sends on every API call. */
@Service
public class JwtService {

    private static final String CLAIM_ROLES = "roles";
    /** HS256 needs a 256-bit key; anything shorter is rejected by jjwt anyway. */
    private static final int MIN_SECRET_BYTES = 32;

    private final DiceProperties properties;
    private final SecretKey key;

    public JwtService(DiceProperties properties) {
        this.properties = properties;
        byte[] secret = properties.security().jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "dice.security.jwt.secret must be at least " + MIN_SECRET_BYTES
                            + " bytes (got " + secret.length + "). Generate one with: openssl rand -base64 48");
        }
        this.key = Keys.hmacShaKeyFor(secret);
    }

    @PostConstruct
    void warnOnDefaultSecret() {
        if (properties.security().jwt().secret().startsWith("dev-only")) {
            org.slf4j.LoggerFactory.getLogger(JwtService.class)
                    .warn("Using the sample JWT secret from .env.example — do not do this outside local dev.");
        }
    }

    public String issue(String username, List<Role> roles) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(properties.security().jwt().expirationMs());
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_ROLES, roles.stream().map(Role::name).toList())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    /**
     * @return the verified claims
     * @throws JwtException if the signature is bad, the token is malformed, or it expired
     */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    @SuppressWarnings("unchecked")
    public List<Role> rolesOf(Claims claims) {
        List<String> raw = claims.get(CLAIM_ROLES, List.class);
        return raw == null ? List.of() : raw.stream().map(Role::valueOf).toList();
    }

    public long expirationMs() {
        return properties.security().jwt().expirationMs();
    }
}
