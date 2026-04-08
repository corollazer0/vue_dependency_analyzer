package com.example.service;

import com.example.model.Queue;
import com.example.repository.QueueRepository;
import com.example.service.InventoryService;
import com.example.service.CartService;
import com.example.service.PaymentService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class QueueService {

    private final QueueRepository queueRepository;
    private final InventoryService inventoryService;
    private final CartService cartService;
    private final PaymentService paymentService;


    public QueueService(QueueRepository queueRepository, InventoryService inventoryService, CartService cartService, PaymentService paymentService) {
        this.queueRepository = queueRepository;
        this.inventoryService = inventoryService;
        this.cartService = cartService;
        this.paymentService = paymentService;
    }

    public List<Queue> findAll() {
        return queueRepository.findAll();
    }

    public Optional<Queue> findById(Long id) {
        return queueRepository.findById(id);
    }

    public Queue save(Queue entity) {
        return queueRepository.save(entity);
    }

    public void deleteById(Long id) {
        queueRepository.deleteById(id);
    }

}
