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
        // customerId 1 matches "Acme Corp" as seeded in quotation-service's DataSeeder.
        seed("customer", "customer@example.com", "Customer@1234", "CUSTOMER", 1L);
    }

    private void seed(String username, String email, String password, String role, Long customerId) {
        if (users.existsByUsername(username)) {
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setCustomerId(customerId);
        users.save(user);
    }
}
