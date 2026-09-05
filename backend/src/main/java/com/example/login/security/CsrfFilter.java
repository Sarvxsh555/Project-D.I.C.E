package com.example.login.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Base64;
import java.util.Set;

/**
 * Double-submit-cookie CSRF protection for the two endpoints that rely on an ambient cookie
 * (refresh, logout) rather than an explicit Authorization header. Bearer-token endpoints don't
 * need this: browsers won't attach an Authorization header to a cross-site request on their own.
 */
@Component
public class CsrfFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of("/api/auth/refresh", "/api/auth/logout");

    private final boolean secure;

    public CsrfFilter(@Value("${app.cookie.secure}") boolean secure) {
        this.secure = secure;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String existingCsrfCookie = readCookie(request, CookieUtil.CSRF_COOKIE);
        if (existingCsrfCookie == null) {
            existingCsrfCookie = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(KeyGenerators.secureRandom(32).generateKey());
            ResponseCookie cookie = ResponseCookie.from(CookieUtil.CSRF_COOKIE, existingCsrfCookie)
                    .httpOnly(false)
                    .secure(secure)
                    .sameSite("Strict")
                    .path("/")
                    .build();
            response.addHeader("Set-Cookie", cookie.toString());
        }

        if (PROTECTED_PATHS.contains(request.getRequestURI())) {
            String header = request.getHeader("X-XSRF-TOKEN");
            if (header == null || !header.equals(existingCsrfCookie)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Missing or invalid CSRF token\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
