package com.example.service;

import com.example.model.Inventory;
import com.example.repository.InventoryRepository;
import com.example.service.AuthService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final AuthService authService;


    public InventoryService(InventoryRepository inventoryRepository, AuthService authService) {
        this.inventoryRepository = inventoryRepository;
        this.authService = authService;
    }

    public List<Inventory> findAll() {
        return inventoryRepository.findAll();
    }

    public Optional<Inventory> findById(Long id) {
        return inventoryRepository.findById(id);
    }

    public Inventory save(Inventory entity) {
        return inventoryRepository.save(entity);
    }

    public void deleteById(Long id) {
        inventoryRepository.deleteById(id);
    }

}
