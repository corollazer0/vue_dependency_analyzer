package com.shop.order.service;

import org.springframework.stereotype.Service;
import org.springframework.context.event.EventListener;

@Service
public class NotificationService {


    @EventListener
    public void handleOrderCreatedEvent(OrderCreatedEvent event) {
        // handle event
    }
}
