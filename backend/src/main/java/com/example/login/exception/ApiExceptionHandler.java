package com.example.login.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Writes the response directly instead of letting Spring Boot's default resolver call
 * response.sendError(), which triggers an internal /error forward. That forward re-enters
 * the (stateless, JWT-only) security filter chain and can get 401'd before the real status
 * code is ever written (e.g. a 409/403 turning into a 401).
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("success", false, "message", ex.getReason()));
    }
}
