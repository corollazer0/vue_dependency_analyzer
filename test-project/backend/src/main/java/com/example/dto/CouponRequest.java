package com.example.dto;

import java.util.List;

public class CouponRequest {
    private Long id;
    private String code;
    private int discountPercent;
    private java.math.BigDecimal minOrderAmount;
    private java.time.LocalDateTime expiresAt;
    private boolean isActive;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public int getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(int discountPercent) { this.discountPercent = discountPercent; }
    public java.math.BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(java.math.BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }
    public java.time.LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(java.time.LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public boolean isActive() { return isActive; }
    public void setIsActive(boolean isActive) { this.isActive = isActive; }
}
