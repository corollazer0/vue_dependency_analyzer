package com.shop.user.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.user.service.UserService;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) { this.userService = userService; }

    @GetMapping("")
    public ResponseEntity<List<UserResponse>> getUser() {
        return ResponseEntity.ok(userService.handle());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserid(@PathVariable Long id) {
        return ResponseEntity.ok(userService.handle());
    }

    @PostMapping("")
    public ResponseEntity<UserResponse> postUser(@RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.handle());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> putUserid(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.handle());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteUserid(@PathVariable Long id) {
        return ResponseEntity.ok(userService.handle());
    }
}
