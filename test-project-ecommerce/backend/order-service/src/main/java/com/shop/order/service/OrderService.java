package com.shop.order.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final ApplicationEventPublisher eventPublisher;

    public void doAction() {
        eventPublisher.publishEvent(new OrderCreatedEvent());
    }
}
