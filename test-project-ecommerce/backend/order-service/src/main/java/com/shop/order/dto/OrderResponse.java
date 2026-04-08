package com.shop.order.dto;

public class OrderResponse {
    private Long id;
    private Long userId;
    private List<OrderItemResponse> items;
    private BigDecimal totalAmount;
    private String status;
    private String shippingAddress;
    private String trackingNumber;
    private String createdAt;
    private String paidAt;
    private String internalNote;
}
