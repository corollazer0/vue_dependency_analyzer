package com.example.controller;

import com.example.service.ReportService;
import com.example.model.Report;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("")
    public ResponseEntity<List<Report>> getReport() {
        return ResponseEntity.ok(reportService.getReport());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Report> getReport1(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReport1(id));
    }

    @PostMapping("")
    public ResponseEntity<Report> postReport2(@RequestBody ReportRequest request) {
        return ResponseEntity.ok(reportService.postReport2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Report> putReport3(@PathVariable Long id, @RequestBody ReportRequest request) {
        return ResponseEntity.ok(reportService.putReport3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteReport4(@PathVariable Long id) {
        reportService.deleteReport4(id);
        return ResponseEntity.noContent().build();
    }
}
