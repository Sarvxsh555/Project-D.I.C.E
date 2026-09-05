package com.dice.repository;

import com.dice.domain.User;
import com.dice.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    List<User> findByRole(Role role);

    List<User> findByActiveTrue();
}
