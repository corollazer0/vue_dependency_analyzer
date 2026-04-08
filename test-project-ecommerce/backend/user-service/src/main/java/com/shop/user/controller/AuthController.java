package com.shop.user.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.user.service.AuthService;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    public AuthController(AuthService authService) { this.authService = authService; }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> postAuthlogin(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.handle());
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> postAuthregister(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.handle());
    }

    @PostMapping("/logout")
    public ResponseEntity<void> postAuthlogout() {
        return ResponseEntity.ok(authService.handle());
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> postAuthrefresh() {
        return ResponseEntity.ok(authService.handle());
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getAuthme() {
        return ResponseEntity.ok(authService.handle());
    }
}
