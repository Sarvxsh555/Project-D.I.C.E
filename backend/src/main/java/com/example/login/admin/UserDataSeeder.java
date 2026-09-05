package com.example.login.admin;

import com.example.login.model.User;
import com.example.login.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserDataSeeder implements CommandLineRunner {

    private static final String TEST_USERNAME = "testuser";
    private static final String TEST_EMAIL = "testuser@example.com";
    private static final String TEST_PASSWORD = "Test@1234";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserDataSeeder(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (users.existsByUsername(TEST_USERNAME)) {
            return;
        }

        User user = new User();
        user.setUsername(TEST_USERNAME);
        user.setEmail(TEST_EMAIL);
        user.setPasswordHash(passwordEncoder.encode(TEST_PASSWORD));
        users.save(user);
    }
}
