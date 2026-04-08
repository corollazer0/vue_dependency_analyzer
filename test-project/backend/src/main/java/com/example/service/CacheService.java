package com.example.service;

import com.example.model.Cache;
import com.example.repository.CacheRepository;
import com.example.service.ReportService;
import com.example.service.CategoryService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class CacheService {

    private final CacheRepository cacheRepository;
    private final ReportService reportService;
    private final CategoryService categoryService;


    public CacheService(CacheRepository cacheRepository, ReportService reportService, CategoryService categoryService) {
        this.cacheRepository = cacheRepository;
        this.reportService = reportService;
        this.categoryService = categoryService;
    }

    public List<Cache> findAll() {
        return cacheRepository.findAll();
    }

    public Optional<Cache> findById(Long id) {
        return cacheRepository.findById(id);
    }

    public Cache save(Cache entity) {
        return cacheRepository.save(entity);
    }

    public void deleteById(Long id) {
        cacheRepository.deleteById(id);
    }

}
