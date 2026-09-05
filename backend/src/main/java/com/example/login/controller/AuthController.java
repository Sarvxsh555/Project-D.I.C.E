package com.example.login.controller;

import com.example.login.dto.*;
import com.example.login.security.CookieUtil;
import com.example.login.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieUtil cookieUtil;

    public AuthController(AuthService authService, CookieUtil cookieUtil) {
        this.authService = authService;
        this.cookieUtil = cookieUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @Valid @RequestBody SignupRequest request, HttpServletRequest req, HttpServletResponse res) {
        AuthService.AuthResult result = authService.signup(request, req.getRemoteAddr());
        cookieUtil.setRefreshCookie(res, result.refreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(true, result.message(), result.accessToken()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest req, HttpServletResponse res) {
        AuthService.AuthResult result = authService.login(request, req.getRemoteAddr());
        cookieUtil.setRefreshCookie(res, result.refreshToken());
        return ResponseEntity.ok(new AuthResponse(true, result.message(), result.accessToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest req, HttpServletResponse res) {
        String rawRefreshToken = extractRefreshCookie(req);
        AuthService.AuthResult result = authService.refresh(rawRefreshToken);
        cookieUtil.setRefreshCookie(res, result.refreshToken());
        return ResponseEntity.ok(new AuthResponse(true, result.message(), result.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest req,
            HttpServletResponse res) {
        String accessToken = authHeader != null ? authHeader.replaceFirst("^Bearer ", "") : null;
        String rawRefreshToken = findRefreshCookie(req);
        authService.logout(accessToken, rawRefreshToken);
        cookieUtil.clearRefreshCookie(res);
        return ResponseEntity.ok(new AuthResponse(true, "Logged out", null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(new AuthResponse(true, "If that email is registered, a reset link has been sent", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(new AuthResponse(true, "Password reset successful", null));
    }

    private String extractRefreshCookie(HttpServletRequest req) {
        String value = findRefreshCookie(req);
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh token cookie present");
        }
        return value;
    }

    private String findRefreshCookie(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : req.getCookies()) {
            if (CookieUtil.REFRESH_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
