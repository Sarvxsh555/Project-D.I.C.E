package com.dice.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Forwards legacy /api/v1/* calls to canonical /api/* endpoints seamlessly.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiVersionForwardFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest req) {
            String uri = req.getRequestURI();
            if (uri.startsWith("/api/v1/")) {
                String newUri = uri.replaceFirst("^/api/v1/", "/api/");
                req.getRequestDispatcher(newUri).forward(request, response);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
