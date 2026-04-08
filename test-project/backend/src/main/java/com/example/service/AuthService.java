package com.example.service;

import com.example.model.Auth;
import com.example.repository.AuthRepository;
import com.example.service.SettingsService;
import com.example.service.InventoryService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final SettingsService settingsService;
    private final InventoryService inventoryService;


    public AuthService(AuthRepository authRepository, SettingsService settingsService, InventoryService inventoryService) {
        this.authRepository = authRepository;
        this.settingsService = settingsService;
        this.inventoryService = inventoryService;
    }

    public List<Auth> findAll() {
        return authRepository.findAll();
    }

    public Optional<Auth> findById(Long id) {
        return authRepository.findById(id);
    }

    public Auth save(Auth entity) {
        return authRepository.save(entity);
    }

    public void deleteById(Long id) {
        authRepository.deleteById(id);
    }

}
