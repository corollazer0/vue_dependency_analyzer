package com.example.service;

import com.example.model.Settings;
import com.example.repository.SettingsRepository;
import com.example.service.CartService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SettingsService {

    private final SettingsRepository settingsRepository;
    private final CartService cartService;


    public SettingsService(SettingsRepository settingsRepository, CartService cartService) {
        this.settingsRepository = settingsRepository;
        this.cartService = cartService;
    }

    public List<Settings> findAll() {
        return settingsRepository.findAll();
    }

    public Optional<Settings> findById(Long id) {
        return settingsRepository.findById(id);
    }

    public Settings save(Settings entity) {
        return settingsRepository.save(entity);
    }

    public void deleteById(Long id) {
        settingsRepository.deleteById(id);
    }

}
