package com.example.dto;

import java.util.List;

public class WishlistSummary {
    private Long id;
    private Long userId;
    private Long productId;
    private java.time.LocalDateTime addedAt;
    private int priority;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public java.time.LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(java.time.LocalDateTime addedAt) { this.addedAt = addedAt; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
