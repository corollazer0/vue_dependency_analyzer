package com.example.event;

import org.springframework.context.ApplicationEvent;

public class OrderCreatedEvent extends ApplicationEvent {

    private final Long orderId;
    private final String orderName;

    public OrderCreatedEvent(Object source, Long orderId, String orderName) {
        super(source);
        this.orderId = orderId;
        this.orderName = orderName;
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getOrderName() {
        return orderName;
    }
}
