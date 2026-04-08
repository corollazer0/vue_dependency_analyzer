package com.example.service;

import com.example.model.Report;
import com.example.repository.ReportRepository;
import com.example.service.DashboardService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final DashboardService dashboardService;


    public ReportService(ReportRepository reportRepository, DashboardService dashboardService) {
        this.reportRepository = reportRepository;
        this.dashboardService = dashboardService;
    }

    public List<Report> findAll() {
        return reportRepository.findAll();
    }

    public Optional<Report> findById(Long id) {
        return reportRepository.findById(id);
    }

    public Report save(Report entity) {
        return reportRepository.save(entity);
    }

    public void deleteById(Long id) {
        reportRepository.deleteById(id);
    }

}
