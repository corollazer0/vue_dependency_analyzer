package com.shop.product.dto;

public class ProductRequest {
    private String title;
    private String description;
    private BigDecimal price;
    private int stock;
    private Long categoryId;
    private List<String> images;
}
