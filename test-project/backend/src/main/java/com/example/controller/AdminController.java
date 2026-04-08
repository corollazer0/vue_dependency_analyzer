package com.example.controller;

import com.example.service.AdminService;
import com.example.model.Admin;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/admins")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("")
    public ResponseEntity<List<Admin>> getAdmin() {
        return ResponseEntity.ok(adminService.getAdmin());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Admin> getAdmin1(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getAdmin1(id));
    }

    @PostMapping("")
    public ResponseEntity<Admin> postAdmin2(@RequestBody AdminRequest request) {
        return ResponseEntity.ok(adminService.postAdmin2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Admin> putAdmin3(@PathVariable Long id, @RequestBody AdminRequest request) {
        return ResponseEntity.ok(adminService.putAdmin3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteAdmin4(@PathVariable Long id) {
        adminService.deleteAdmin4(id);
        return ResponseEntity.noContent().build();
    }
}
