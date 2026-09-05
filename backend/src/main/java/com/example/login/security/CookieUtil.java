package com.example.login.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    public static final String REFRESH_COOKIE = "refresh_token";
    public static final String CSRF_COOKIE = "XSRF-TOKEN";

    private final boolean secure;
    private final long refreshExpirationDays;

    public CookieUtil(
            @Value("${app.cookie.secure}") boolean secure,
            @Value("${app.jwt.refresh-expiration-days}") long refreshExpirationDays) {
        this.secure = secure;
        this.refreshExpirationDays = refreshExpirationDays;
    }

    public void setRefreshCookie(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, rawToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(refreshExpirationDays * 24 * 3600)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
