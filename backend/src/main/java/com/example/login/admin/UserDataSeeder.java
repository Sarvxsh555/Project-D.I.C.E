package com.example.login.admin;

import com.example.login.model.User;
import com.example.login.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserDataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserDataSeeder(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seed("testuser", "testuser@example.com", "Test@1234", "SALES_REP", null);
        seed("manager", "manager@example.com", "Manager@1234", "SALES_MANAGER", null);
        seed("finance", "finance@example.com", "Finance@1234", "FINANCE", null);
        seed("admin", "admin@example.com", "Admin@1234", "ADMIN", null);
        // customerId values match quotation-service DataSeeder insert order.
        seed("acme", "buyer@acme.com", "Acme@1234", "CUSTOMER", 1L);
        seed("globex", "procurement@globex.com", "Globex@1234", "CUSTOMER", 2L);
        seed("initech", "orders@initech.com", "Initech@1234", "CUSTOMER", 3L);
        seed("umbrella", "contact@umbrella.com", "Umbrella@1234", "CUSTOMER", 4L);
        seed("customer", "customer@example.com", "Customer@1234", "CUSTOMER", 1L);
    }

    private void seed(String username, String email, String password, String role, Long customerId) {
        users.findByUsername(username).ifPresentOrElse(existing -> {
            boolean dirty = false;
            if (!role.equals(existing.getRole())) {
                existing.setRole(role);
                dirty = true;
            }
            if (customerId != null && !customerId.equals(existing.getCustomerId())) {
                existing.setCustomerId(customerId);
                dirty = true;
            }
            if (dirty) users.save(existing);
        }, () -> {
            if (users.existsByEmail(email)) return;
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setRole(role);
            user.setCustomerId(customerId);
            users.save(user);
        });
    }
}
