package com.example.controller;

import com.example.service.DashboardService;
import com.example.model.Dashboard;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("")
    public ResponseEntity<List<Dashboard>> getDashboard() {
        return ResponseEntity.ok(dashboardService.getDashboard());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Dashboard> getDashboard1(@PathVariable Long id) {
        return ResponseEntity.ok(dashboardService.getDashboard1(id));
    }

    @PostMapping("")
    public ResponseEntity<Dashboard> postDashboard2(@RequestBody DashboardRequest request) {
        return ResponseEntity.ok(dashboardService.postDashboard2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Dashboard> putDashboard3(@PathVariable Long id, @RequestBody DashboardRequest request) {
        return ResponseEntity.ok(dashboardService.putDashboard3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteDashboard4(@PathVariable Long id) {
        dashboardService.deleteDashboard4(id);
        return ResponseEntity.noContent().build();
    }
}
