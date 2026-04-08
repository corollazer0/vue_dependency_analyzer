package com.example.controller;

import com.example.service.UserService;
import com.example.model.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("")
    public ResponseEntity<List<User>> getUser() {
        return ResponseEntity.ok(userService.getUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser1(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser1(id));
    }

    @PostMapping("")
    public ResponseEntity<User> postUser2(@RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.postUser2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> putUser3(@PathVariable Long id, @RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.putUser3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteUser4(@PathVariable Long id) {
        userService.deleteUser4(id);
        return ResponseEntity.noContent().build();
    }
}
