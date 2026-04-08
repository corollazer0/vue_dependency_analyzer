package com.shop.order.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public void doAction() {
        eventPublisher.publishEvent(new OrderPaidEvent());
    }
}
