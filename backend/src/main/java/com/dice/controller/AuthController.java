package com.dice.controller;

import com.dice.domain.User;
import com.dice.repository.UserRepository;
import com.dice.security.JwtService;
import com.dice.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Issues the bearer tokens the SPA uses, and owns real user registration.
 * Backed by {@code users} (see {@link com.dice.security.DiceUserDetailsService})
 * — not an in-memory demo store.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final URI TYPE_CONFLICT = URI.create("https://dice.local/errors/conflict");

    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        UserDetails user;
        try {
            user = userDetailsService.loadUserByUsername(request.username().toLowerCase().trim());
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
        User profile = userRepository.findByUsername(user.getUsername()).orElse(null);

        return ResponseEntity.ok(new TokenResponse(
                jwtService.issue(user.getUsername(), roles),
                user.getUsername(),
                roles,
                jwtService.expirationMs(),
                profile != null ? profile.getFullName() : null,
                profile != null ? profile.getEmail() : null));
    }

    /** Lets the SPA confirm a stored token is still good on page load. */
    @GetMapping("/me")
    public ResponseEntity<CurrentUser> me(
            org.springframework.security.core.Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        User profile = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(new CurrentUser(
                authentication.getName(),
                authentication.getAuthorities().stream()
                        .map(granted -> Role.fromAuthority(granted.getAuthority()))
                        .toList(),
                profile != null ? profile.getFullName() : null,
                profile != null ? profile.getEmail() : null));
    }

    /**
     * Persists a real user with a hashed password. Deliberately does not issue
     * a token — the SPA sends the user to /login afterwards, same as any other
     * signup flow; register and authenticate are two different actions.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String username = request.username().toLowerCase().trim();
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByUsername(username)) {
            return conflict("Username already taken");
        }
        if (userRepository.existsByEmail(email)) {
            return conflict("Email already registered");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .fullName(request.fullName().trim())
                .role(request.role())
                .passwordHash(passwordEncoder.encode(request.password()))
                .active(true)
                .build();

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            // Race: two concurrent signups for the same username/email past the
            // existsBy checks above. The DB's UNIQUE constraints are the real
            // guard; this just turns the resulting 500 into an honest 409.
            return conflict("Username or email already registered");
        }

        log.info("Registered new user {} ({})", username, request.role());
        return ResponseEntity
                .created(URI.create("/api/users/" + user.getId()))
                .body(new RegisteredUser(user.getId(), user.getUsername(), user.getEmail(), user.getRole()));
    }

    private ResponseEntity<ProblemDetail> conflict(String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail);
        problem.setTitle("Registration conflict");
        problem.setType(TYPE_CONFLICT);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @GetMapping("/stakeholders")
    public ResponseEntity<List<StakeholderInfo>> getStakeholders() {
        return ResponseEntity.ok(List.of(
                new StakeholderInfo("SALES_REP", "Sales Representative", "Manage deal pipeline, draft proposals, simulate discounts", "/dashboard/sales-rep"),
                new StakeholderInfo("SALES_MANAGER", "Sales Manager", "Approve exception discounts, monitor SLA timers, view team margin radar", "/dashboard/sales-manager"),
                new StakeholderInfo("FINANCE", "Finance Controller", "Track cash milestones, AR aging, review commercial payment terms", "/dashboard/finance"),
                new StakeholderInfo("OPERATIONS", "Operations & WMS", "Allocate stock across depots WH-A, WH-B, WH-C, manage dispatch orders", "/dashboard/operations"),
                new StakeholderInfo("ADMIN", "Executive Admin", "Complete 360 overview, master discount rules, pricelists, product catalog", "/dashboard/executive"),
                new StakeholderInfo("CUSTOMER", "Client Stakeholder", "Inspect quotation, submit counteroffers, digitally accept proposals", "/portal")
        ));
    }

    /** Stateless JWT: nothing to invalidate server-side. The SPA discards its
     *  stored token; a 204 confirms the client is clear to do so. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
            @NotBlank @Email String email,
            @NotBlank String fullName,
            @NotNull Role role,
            String departmentOrCompany,
            String territory,
            String warehouseDepot
    ) {
    }

    public record StakeholderInfo(String role, String title, String description, String defaultDashboard) {
    }

    public record TokenResponse(String token, String username, List<Role> roles, long expiresInMs,
                                String fullName, String email) {
    }

    public record CurrentUser(String username, List<Role> roles, String fullName, String email) {
    }

    public record RegisteredUser(UUID id, String username, String email, Role role) {
    }
}
