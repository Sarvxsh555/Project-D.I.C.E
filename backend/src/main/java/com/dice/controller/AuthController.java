package com.dice.controller;

import com.dice.security.JwtService;
import com.dice.security.Role;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Issues the bearer tokens the SPA uses. Backed by the in-memory demo user
 * store in {@code SecurityConfig} — see docs/demo-flow.md for the accounts.
 *
 * <p>Not in the original module plan, but nothing else mints a token, so the
 * API would be unusable without it. Replace wholesale when real identity lands.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest request) {
        UserDetails user;
        try {
            user = userDetailsService.loadUserByUsername(request.username());
        } catch (UsernameNotFoundException e) {
            // Same response as a bad password: don't leak which usernames exist.
            return ResponseEntity.status(401).build();
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            return ResponseEntity.status(401).build();
        }

        List<Role> roles = user.getAuthorities().stream()
                .map(granted -> Role.fromAuthority(granted.getAuthority()))
                .toList();

        return ResponseEntity.ok(new TokenResponse(
                jwtService.issue(user.getUsername(), roles),
                user.getUsername(),
                roles,
                jwtService.expirationMs()));
    }

    /** Lets the SPA confirm a stored token is still good on page load. */
    @GetMapping("/me")
    public ResponseEntity<CurrentUser> me(
            org.springframework.security.core.Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(new CurrentUser(
                authentication.getName(),
                authentication.getAuthorities().stream()
                        .map(granted -> Role.fromAuthority(granted.getAuthority()))
                        .toList()));
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record TokenResponse(String token, String username, List<Role> roles, long expiresInMs) {
    }

    public record CurrentUser(String username, List<Role> roles) {
    }
}
