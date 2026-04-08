package com.shop.order.event;

public class OrderPaidEvent {
    private final Long orderId;
    private final Long paymentId;
    private final BigDecimal amount;
    public OrderPaidEvent(Long orderId, Long paymentId, BigDecimal amount) {
        this.orderId = orderId; this.paymentId = paymentId; this.amount = amount;
    }
}
