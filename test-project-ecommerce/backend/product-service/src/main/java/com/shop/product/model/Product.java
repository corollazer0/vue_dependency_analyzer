package com.shop.product.model;

import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String description;
    private BigDecimal price;
    private int stock;
    private Long categoryId;
    private String images;
    private double rating;
    private int reviewCount;
    private String internalSku;
}
