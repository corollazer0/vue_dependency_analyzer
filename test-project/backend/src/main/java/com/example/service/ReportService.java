package com.example.service;

import com.example.model.Report;
import com.example.repository.ReportRepository;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ReportService {

    private final ReportRepository reportRepository;


    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
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
