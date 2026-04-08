package com.shop.order.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.order.service.DashboardService;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;
    public DashboardController(DashboardService dashboardService) { this.dashboardService = dashboardService; }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardstats() {
        return ResponseEntity.ok(dashboardService.handle());
    }

    @GetMapping("/sales")
    public ResponseEntity<List<SalesDataPoint>> getDashboardsales() {
        return ResponseEntity.ok(dashboardService.handle());
    }

    @GetMapping("/recent-orders")
    public ResponseEntity<List<OrderResponse>> getDashboardrecentorders() {
        return ResponseEntity.ok(dashboardService.handle());
    }

    @GetMapping("/top-products")
    public ResponseEntity<List<TopProductResponse>> getDashboardtopproducts() {
        return ResponseEntity.ok(dashboardService.handle());
    }
}
