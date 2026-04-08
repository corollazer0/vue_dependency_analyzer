package com.shop.product.event;

public class ProductUpdatedEvent {
    private final Long productId;
    private final String action;
    public ProductUpdatedEvent(Long productId, String action) {
        this.productId = productId; this.action = action;
    }
}
