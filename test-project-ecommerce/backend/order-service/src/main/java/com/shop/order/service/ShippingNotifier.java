package com.shop.order.service;

import org.springframework.stereotype.Service;
import org.springframework.context.event.EventListener;

@Service
public class ShippingNotifierService {


    @EventListener
    public void handleOrderPaidEvent(OrderPaidEvent event) {
        // handle event
    }
}
