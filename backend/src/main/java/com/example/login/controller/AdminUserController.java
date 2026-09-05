package com.example.login.controller;

import com.example.login.dto.AdminCreateUserRequest;
import com.example.login.dto.AdminCreateUserResponse;
import com.example.login.dto.AdminResetPasswordResponse;
import com.example.login.dto.UserSummary;
import com.example.login.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AuthService authService;

    public AdminUserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<UserSummary> list() {
        return authService.adminListUsers();
    }

    @PostMapping
    public ResponseEntity<AdminCreateUserResponse> create(@Valid @RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.adminCreateUser(request));
    }

    @PostMapping("/{id}/reset-password")
    public AdminResetPasswordResponse resetPassword(@PathVariable Long id) {
        return authService.adminResetPassword(id);
    }
}
