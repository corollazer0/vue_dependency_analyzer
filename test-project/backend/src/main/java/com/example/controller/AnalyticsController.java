package com.example.controller;

import com.example.service.AnalyticsService;
import com.example.model.Analytics;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("")
    public ResponseEntity<List<Analytics>> getAnalytics() {
        return ResponseEntity.ok(analyticsService.getAnalytics());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Analytics> getAnalytics1(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getAnalytics1(id));
    }

    @PostMapping("")
    public ResponseEntity<Analytics> postAnalytics2(@RequestBody AnalyticsRequest request) {
        return ResponseEntity.ok(analyticsService.postAnalytics2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Analytics> putAnalytics3(@PathVariable Long id, @RequestBody AnalyticsRequest request) {
        return ResponseEntity.ok(analyticsService.putAnalytics3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteAnalytics4(@PathVariable Long id) {
        analyticsService.deleteAnalytics4(id);
        return ResponseEntity.noContent().build();
    }
}
