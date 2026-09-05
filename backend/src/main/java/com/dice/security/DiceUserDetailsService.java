package com.dice.security;

import com.dice.domain.User;
import com.dice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Real, DB-backed authentication. Replaces the in-memory demo account store
 * that used to live in {@code SecurityConfig} — every login now checks the
 * {@code users} table, including the six seeded demo accounts (see
 * {@code DevDataSeeder}, which backfills their {@code password_hash} on
 * first boot using the real {@link org.springframework.security.crypto.password.PasswordEncoder} bean).
 */
@Service
@RequiredArgsConstructor
public class DiceUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No user " + username));

        if (!user.isActive()) {
            throw new UsernameNotFoundException("User " + username + " is deactivated");
        }
        // Fails closed: a profile row with no password set (e.g. Odoo-synced,
        // never provisioned for login) must never authenticate as if it had
        // an empty password.
        if (user.getPasswordHash() == null) {
            throw new UsernameNotFoundException("User " + username + " has no password set");
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority(user.getRole().authority()))
                .disabled(!user.isActive())
                .build();
    }
}
