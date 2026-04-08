package com.shop.order.model;

import jakarta.persistence.*;

@Entity
@Table(name = "orderitems")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long orderId;
    private Long productId;
    private String productName;
    private int quantity;
    private BigDecimal unitPrice;
}
