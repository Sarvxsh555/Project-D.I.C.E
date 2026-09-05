package com.dice.domain;

import com.dice.security.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A DICE user account — the canonical identity behind {@link Deal#getOwnerUsername()}
 * and every other {@code *_username} audit column.
 *
 * <p>Authentication itself still runs on the in-memory demo store in
 * {@code SecurityConfig}; this table is the durable profile record (name,
 * email, role) that the sales UI and audit trail read from. Deliberately not
 * foreign-keyed from {@code deals.owner_username} yet — Odoo-synced deals can
 * carry a username DICE has not provisioned a record for.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
