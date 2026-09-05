package com.example.login.security;

import com.example.login.model.RefreshToken;
import com.example.login.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshExpirationDays;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.jwt.refresh-expiration-days}") long refreshExpirationDays) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshExpirationDays = refreshExpirationDays;
    }

    public String issue(Long userId) {
        String rawToken = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(KeyGenerators.secureRandom(48).generateKey());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setUserId(userId);
        refreshToken.setExpiresAt(Instant.now().plusSeconds(refreshExpirationDays * 24 * 3600));
        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    /**
     * Validates the presented refresh token and rotates it: the old one is revoked and a new
     * one is issued for the same user. If an already-revoked token is presented, that is a signal
     * the token was stolen and reused, so every refresh token for the user is revoked.
     */
    public RotationResult rotate(String rawToken) {
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token"));

        if (existing.isRevoked()) {
            refreshTokenRepository.revokeAllForUser(existing.getUserId());
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token reuse detected; all sessions revoked");
        }

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token expired");
        }

        existing.setRevoked(true);
        refreshTokenRepository.save(existing);

        String newRawToken = issue(existing.getUserId());
        return new RotationResult(existing.getUserId(), newRawToken);
    }

    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public record RotationResult(Long userId, String rawToken) {
    }
}
