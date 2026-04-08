package com.shop.product.dto;

public class ProductResponse {
    private Long id;
    private String title;
    private String description;
    private BigDecimal price;
    private int stock;
    private Long categoryId;
    private List<String> images;
    private double rating;
    private int reviewCount;
    private String internalSku;
}
