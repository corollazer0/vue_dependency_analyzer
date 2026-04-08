package com.example.service;

import com.example.model.Dashboard;
import com.example.repository.DashboardRepository;
import com.example.service.PaymentService;
import com.example.service.ReviewService;
import com.example.service.SettingsService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final PaymentService paymentService;
    private final ReviewService reviewService;
    private final SettingsService settingsService;


    public DashboardService(DashboardRepository dashboardRepository, PaymentService paymentService, ReviewService reviewService, SettingsService settingsService) {
        this.dashboardRepository = dashboardRepository;
        this.paymentService = paymentService;
        this.reviewService = reviewService;
        this.settingsService = settingsService;
    }

    public List<Dashboard> findAll() {
        return dashboardRepository.findAll();
    }

    public Optional<Dashboard> findById(Long id) {
        return dashboardRepository.findById(id);
    }

    public Dashboard save(Dashboard entity) {
        return dashboardRepository.save(entity);
    }

    public void deleteById(Long id) {
        dashboardRepository.deleteById(id);
    }

}
