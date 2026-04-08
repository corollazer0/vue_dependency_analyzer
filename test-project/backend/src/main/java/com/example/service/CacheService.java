package com.example.service;

import com.example.model.Cache;
import com.example.repository.CacheRepository;
import com.example.service.PaymentService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class CacheService {

    private final CacheRepository cacheRepository;
    private final PaymentService paymentService;

    public CacheService(CacheRepository cacheRepository, PaymentService paymentService) {
        this.cacheRepository = cacheRepository;
        this.paymentService = paymentService;
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
