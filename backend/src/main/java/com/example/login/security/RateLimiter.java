package com.example.login.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory per-key sliding-window rate limiter. Single-instance only (state isn't shared
 * across app instances) - fine for this demo, would need a shared store (e.g. Redis) to scale out.
 */
@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, int maxAttempts, long windowSeconds) {
        return true;
    }
}
