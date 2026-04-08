package com.example.service;

import com.example.model.Analytics;
import com.example.repository.AnalyticsRepository;
import com.example.service.SearchService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final SearchService searchService;

    public AnalyticsService(AnalyticsRepository analyticsRepository, SearchService searchService) {
        this.analyticsRepository = analyticsRepository;
        this.searchService = searchService;
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
