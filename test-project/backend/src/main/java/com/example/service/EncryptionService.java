package com.example.service;

import com.example.model.Encryption;
import com.example.repository.EncryptionRepository;
import com.example.service.CartService;
import com.example.service.PaymentService;
import com.example.service.OrderService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EncryptionService {

    private final EncryptionRepository encryptionRepository;
    private final CartService cartService;
    private final PaymentService paymentService;
    private final OrderService orderService;


    public EncryptionService(EncryptionRepository encryptionRepository, CartService cartService, PaymentService paymentService, OrderService orderService) {
        this.encryptionRepository = encryptionRepository;
        this.cartService = cartService;
        this.paymentService = paymentService;
        this.orderService = orderService;
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
