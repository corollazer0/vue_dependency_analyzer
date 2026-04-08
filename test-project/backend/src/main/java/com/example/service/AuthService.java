package com.example.service;

import com.example.model.Auth;
import com.example.repository.AuthRepository;
import com.example.service.ShippingService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final ShippingService shippingService;

    public AuthService(AuthRepository authRepository, ShippingService shippingService) {
        this.authRepository = authRepository;
        this.shippingService = shippingService;
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
