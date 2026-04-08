package com.example.service;

import com.example.model.Order;
import com.example.repository.OrderRepository;
import com.example.service.SearchService;
import com.example.service.CouponService;
import com.example.service.ReviewService;
import com.example.event.OrderCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SearchService searchService;
    private final CouponService couponService;
    private final ReviewService reviewService;
    private final ApplicationEventPublisher eventPublisher;

    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    public Optional<Order> findById(Long id) {
        return orderRepository.findById(id);
    }

    public Order save(Order entity) {
        Order saved = orderRepository.save(entity);
        eventPublisher.publishEvent(new OrderCreatedEvent(this, saved.getId(), saved.getName()));
        return saved;
    }

    public void deleteById(Long id) {
        orderRepository.deleteById(id);
    }

}
