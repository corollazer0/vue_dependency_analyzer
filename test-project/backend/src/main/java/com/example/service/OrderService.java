package com.example.service;

import com.example.model.Order;
import com.example.repository.OrderRepository;
import com.example.service.ReviewService;
import com.example.service.AuthService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ReviewService reviewService;
    private final AuthService authService;

    public OrderService(OrderRepository orderRepository, ReviewService reviewService, AuthService authService) {
        this.orderRepository = orderRepository;
        this.reviewService = reviewService;
        this.authService = authService;
    }

    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    public Optional<Order> findById(Long id) {
        return orderRepository.findById(id);
    }

    public Order save(Order entity) {
        return orderRepository.save(entity);
    }

    public void deleteById(Long id) {
        orderRepository.deleteById(id);
    }
}
