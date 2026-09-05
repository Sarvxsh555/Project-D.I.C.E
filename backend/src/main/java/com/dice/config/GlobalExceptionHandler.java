package com.dice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.stream.Collectors;

/**
 * Maps domain exceptions to HTTP responses so controllers stay free of
 * try/catch. Responses use RFC 9457 {@code ProblemDetail}, which the frontend's
 * {@code api.ts} interceptor understands.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final URI TYPE_VALIDATION = URI.create("https://dice.local/errors/validation");
    private static final URI TYPE_NOT_FOUND = URI.create("https://dice.local/errors/not-found");
    private static final URI TYPE_CONFLICT = URI.create("https://dice.local/errors/conflict");
    private static final URI TYPE_FORBIDDEN = URI.create("https://dice.local/errors/forbidden");

    /** Services throw this for unknown ids — treated as a 404, not a 500. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail onNotFound(IllegalArgumentException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problem.setTitle("Resource not found");
        problem.setType(TYPE_NOT_FOUND);
        return problem;
    }

    /** An operation attempted against a deal in the wrong state. */
    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail onConflict(IllegalStateException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
        problem.setTitle("Operation not valid in current state");
        problem.setType(TYPE_CONFLICT);
        return problem;
    }

    /** Raised by ApprovalService when a role lacks authority over a request. */
    @ExceptionHandler(SecurityException.class)
    public ProblemDetail onForbidden(SecurityException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.getMessage());
        problem.setTitle("Insufficient authority");
        problem.setType(TYPE_FORBIDDEN);
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail onValidationFailure(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
                .map(error -> "%s %s".formatted(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.joining("; "));

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setTitle("Request validation failed");
        problem.setType(TYPE_VALIDATION);
        return problem;
    }

    /**
     * Anything unanticipated. Logged with a stack trace, but the response stays
     * generic — internal messages are not the client's business.
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail onUnexpected(Exception e) {
        log.error("Unhandled exception", e);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        problem.setTitle("Internal error");
        return problem;
    }
}
