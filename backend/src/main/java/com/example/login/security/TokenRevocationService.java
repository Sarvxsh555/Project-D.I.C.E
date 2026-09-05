package com.example.login.security;

import com.example.login.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Separate bean so the REQUIRES_NEW revocation commits independently of the caller's transaction
 * (e.g. RefreshTokenService.rotate() throws right after calling this on reuse detection - if this
 * ran in the same transaction, that exception would roll the revocation back too).
 */
@Service
public class TokenRevocationService {

    private final RefreshTokenRepository refreshTokenRepository;

    public TokenRevocationService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForUser(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId);
    }
}
