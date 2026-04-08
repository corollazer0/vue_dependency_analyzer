package com.example.service;

import com.example.model.Analytics;
import com.example.repository.AnalyticsRepository;
import com.example.service.SettingsService;
import com.example.service.PaymentService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final SettingsService settingsService;
    private final PaymentService paymentService;


    public AnalyticsService(AnalyticsRepository analyticsRepository, SettingsService settingsService, PaymentService paymentService) {
        this.analyticsRepository = analyticsRepository;
        this.settingsService = settingsService;
        this.paymentService = paymentService;
    }

    public List<Analytics> findAll() {
        return analyticsRepository.findAll();
    }

    public Optional<Analytics> findById(Long id) {
        return analyticsRepository.findById(id);
    }

    public Analytics save(Analytics entity) {
        return analyticsRepository.save(entity);
    }

    public void deleteById(Long id) {
        analyticsRepository.deleteById(id);
    }

}
