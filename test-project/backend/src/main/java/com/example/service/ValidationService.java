package com.example.service;

import com.example.model.Validation;
import com.example.repository.ValidationRepository;
import com.example.service.AuthService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ValidationService {

    private final ValidationRepository validationRepository;
    private final AuthService authService;

    public ValidationService(ValidationRepository validationRepository, AuthService authService) {
        this.validationRepository = validationRepository;
        this.authService = authService;
    }

    public List<Validation> findAll() {
        return validationRepository.findAll();
    }

    public Optional<Validation> findById(Long id) {
        return validationRepository.findById(id);
    }

    public Validation save(Validation entity) {
        return validationRepository.save(entity);
    }

    public void deleteById(Long id) {
        validationRepository.deleteById(id);
    }
}
