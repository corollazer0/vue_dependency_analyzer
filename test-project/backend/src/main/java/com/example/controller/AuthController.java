package com.example.controller;

import com.example.service.AuthService;
import com.example.model.Auth;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> postAuth(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.postAuth());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> postAuth1(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.postAuth1());
    }

    @PostMapping("/logout")
    public ResponseEntity<void> postAuth2(@RequestBody AuthRequest request) {
        authService.postAuth2();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> postAuth3(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.postAuth3());
    }
}
