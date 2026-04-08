package com.shop.order.event;

public class OrderCreatedEvent {
    private final Long orderId;
    private final Long userId;
    private final BigDecimal totalAmount;
    public OrderCreatedEvent(Long orderId, Long userId, BigDecimal totalAmount) {
        this.orderId = orderId; this.userId = userId; this.totalAmount = totalAmount;
    }
}
