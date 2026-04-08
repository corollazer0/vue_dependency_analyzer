package com.example.dto;

import java.util.List;

public class InventoryRequest {
    private Long id;
    private Long productId;
    private Long warehouseId;
    private int quantity;
    private int reservedQuantity;
    private java.time.LocalDateTime lastRestockedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public java.time.LocalDateTime getLastRestockedAt() { return lastRestockedAt; }
    public void setLastRestockedAt(java.time.LocalDateTime lastRestockedAt) { this.lastRestockedAt = lastRestockedAt; }
}
