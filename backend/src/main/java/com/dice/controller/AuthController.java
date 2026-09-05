package com.dice.controller;

import com.dice.domain.Customer;
import com.dice.domain.enums.CustomerSegment;
import com.dice.repository.CustomerRepository;
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

import java.math.BigDecimal;
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
    private final CustomerRepository customerRepository;

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

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@RequestBody RegisterRequest request) {
        if (request.username() == null || request.password() == null || request.role() == null) {
            return ResponseEntity.badRequest().build();
        }

        Role assignedRole = request.role();
        String usernameClean = request.username().toLowerCase().trim();

        if (userDetailsService instanceof org.springframework.security.provisioning.InMemoryUserDetailsManager mgr) {
            if (mgr.userExists(usernameClean)) {
                return ResponseEntity.status(409).build();
            }
            UserDetails newUser = org.springframework.security.core.userdetails.User
                    .withUsername(usernameClean)
                    .password(passwordEncoder.encode(request.password()))
                    .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority(assignedRole.authority()))
                    .build();
            mgr.createUser(newUser);
        }

        // Bind newly registered Customer account with real corporate customer entity
        if (assignedRole == Role.CUSTOMER) {
            String company = request.departmentOrCompany() != null && !request.departmentOrCompany().isBlank()
                    ? request.departmentOrCompany().trim()
                    : "Tata Consultancy Services";

            var existingCust = customerRepository.findAll().stream()
                    .filter(c -> c.getName().equalsIgnoreCase(company)
                            || (c.getPortalUsername() != null && c.getPortalUsername().equalsIgnoreCase(usernameClean)))
                    .findFirst();

            if (existingCust.isPresent()) {
                Customer c = existingCust.get();
                c.setPortalUsername(usernameClean);
                customerRepository.save(c);
            } else {
                Customer newC = Customer.builder()
                        .name(company)
                        .segment(CustomerSegment.ENTERPRISE)
                        .tier("TIER_1")
                        .region("India Commercial")
                        .creditLimit(new BigDecimal("15000000.00"))
                        .outstandingBalance(BigDecimal.ZERO)
                        .paymentTermsDays(30)
                        .riskScore(15)
                        .active(true)
                        .portalUsername(usernameClean)
                        .build();
                customerRepository.save(newC);
            }
        }

        List<Role> roles = List.of(assignedRole);
        return ResponseEntity.ok(new TokenResponse(
                jwtService.issue(usernameClean, roles),
                usernameClean,
                roles,
                jwtService.expirationMs()));
    }

    @GetMapping("/stakeholders")
    public ResponseEntity<List<StakeholderInfo>> getStakeholders() {
        return ResponseEntity.ok(List.of(
                new StakeholderInfo("SALES_REP", "Sales Representative", "Manage deal pipeline, draft proposals, simulate discounts", "/dashboard"),
                new StakeholderInfo("SALES_MANAGER", "Sales Manager", "Approve exception discounts, monitor SLA timers, view team margin radar", "/dashboard"),
                new StakeholderInfo("FINANCE", "Finance Controller", "Track cash milestones, AR aging, review commercial payment terms", "/dashboard"),
                new StakeholderInfo("OPERATIONS", "Operations & WMS", "Allocate stock across depots WH-A, WH-B, WH-C, manage dispatch orders", "/dashboard"),
                new StakeholderInfo("ADMIN", "Executive Admin", "Complete 360 overview, master discount rules, pricelists, product catalog", "/dashboard"),
                new StakeholderInfo("CUSTOMER", "Client Stakeholder", "Inspect quotation, submit counteroffers, digitally accept proposals", "/dashboard")
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RegisterRequest(
            @NotBlank String username,
            @NotBlank String password,
            String email,
            String fullName,
            Role role,
            String departmentOrCompany,
            String territory,
            String warehouseDepot
    ) {
    }

    public record StakeholderInfo(String role, String title, String description, String defaultDashboard) {
    }

    public record TokenResponse(String token, String username, List<Role> roles, long expiresInMs) {
    }

    public record CurrentUser(String username, List<Role> roles) {
    }
}
