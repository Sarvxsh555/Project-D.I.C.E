package com.example.login.service;

import com.example.login.dto.*;
import com.example.login.model.PasswordResetToken;
import com.example.login.model.RevokedToken;
import com.example.login.model.User;
import com.example.login.repository.PasswordResetTokenRepository;
import com.example.login.repository.RevokedTokenRepository;
import com.example.login.repository.UserRepository;
import com.example.login.security.JwtService;
import com.example.login.security.RateLimiter;
import com.example.login.security.RefreshTokenService;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int RESET_TOKEN_VALID_MINUTES = 30;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;

    private static final int LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
    private static final long LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
    private static final int SIGNUP_RATE_LIMIT_MAX_ATTEMPTS = 5;
    private static final long SIGNUP_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RateLimiter rateLimiter;
    private final MailerClient mailerClient;
    private final String frontendBaseUrl;

    public AuthService(
            UserRepository userRepository,
            PasswordResetTokenRepository resetTokenRepository,
            RevokedTokenRepository revokedTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            RateLimiter rateLimiter,
            MailerClient mailerClient,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.revokedTokenRepository = revokedTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.mailerClient = mailerClient;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public record AuthResult(String accessToken, String refreshToken, String message) {
    }

    public AuthResult signup(SignupRequest request, String clientIp) {
        if (!rateLimiter.tryConsume("signup:" + clientIp, SIGNUP_RATE_LIMIT_MAX_ATTEMPTS, SIGNUP_RATE_LIMIT_WINDOW_SECONDS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many signup attempts. Try again later.");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = refreshTokenService.issue(user.getId());
        return new AuthResult(accessToken, refreshToken, "Account created");
    }

    public AuthResult login(LoginRequest request, String clientIp) {
        if (!rateLimiter.tryConsume("login:" + clientIp, LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_SECONDS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Try again later.");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "Account temporarily locked due to repeated failed attempts. Try again later.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            recordFailedAttempt(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = refreshTokenService.issue(user.getId());
        return new AuthResult(accessToken, refreshToken, "Login successful");
    }

    private void recordFailedAttempt(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(Instant.now().plusSeconds(LOCKOUT_MINUTES * 60));
        }
        userRepository.save(user);
    }

    public AuthResult refresh(String rawRefreshToken) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        User user = userRepository.findById(rotation.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole());
        return new AuthResult(accessToken, rotation.rawToken(), "Token refreshed");
    }

    public void logout(String accessToken, String rawRefreshToken) {
        if (accessToken != null) {
            Claims claims = jwtService.parseClaims(accessToken);
            revokedTokenRepository.save(new RevokedToken(claims.getId(), claims.getExpiration().toInstant()));
        }
        if (rawRefreshToken != null) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setToken(token);
            resetToken.setUserId(user.getId());
            resetToken.setExpiresAt(Instant.now().plusSeconds(RESET_TOKEN_VALID_MINUTES * 60L));
            resetTokenRepository.save(resetToken);

            String resetLink = frontendBaseUrl + "/reset-password/" + token;
            try {
                mailerClient.sendResetEmail(user.getEmail(), resetLink);
            } catch (Exception e) {
                log.warn("Failed to send reset email to {}: {}", user.getEmail(), e.getMessage());
            }
        });
        // Always respond the same way regardless of whether the email was found, to avoid leaking account existence.
    }

    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = resetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset link"));

        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset link");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset link"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);
    }
}
