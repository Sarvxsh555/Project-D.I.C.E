package com.example.dealengine.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Writes the response directly instead of letting Spring Boot's default resolver call
 * response.sendError(), which triggers an internal /error forward that re-enters the
 * stateless JWT filter chain and can turn a real status code into a blanket 401.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("success", false, "message", String.valueOf(ex.getReason())));
    }
}
