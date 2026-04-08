package com.shop.order.dto;

public class PaymentRequest {
    private Long orderId;
    private BigDecimal amount;
    private String method;
}
