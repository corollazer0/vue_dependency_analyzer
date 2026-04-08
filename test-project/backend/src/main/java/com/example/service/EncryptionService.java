package com.example.service;

import com.example.model.Encryption;
import com.example.repository.EncryptionRepository;
import com.example.service.DashboardService;
import com.example.service.AuthService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EncryptionService {

    private final EncryptionRepository encryptionRepository;
    private final DashboardService dashboardService;
    private final AuthService authService;

    public EncryptionService(EncryptionRepository encryptionRepository, DashboardService dashboardService, AuthService authService) {
        this.encryptionRepository = encryptionRepository;
        this.dashboardService = dashboardService;
        this.authService = authService;
    }

    public List<Encryption> findAll() {
        return encryptionRepository.findAll();
    }

    public Optional<Encryption> findById(Long id) {
        return encryptionRepository.findById(id);
    }

    public Encryption save(Encryption entity) {
        return encryptionRepository.save(entity);
    }

    public void deleteById(Long id) {
        encryptionRepository.deleteById(id);
    }
}
