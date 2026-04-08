package com.shop.order.dto;

public class CreateOrderRequest {
    private List<OrderItemRequest> items;
    private String shippingAddress;
    private String couponCode;
}
