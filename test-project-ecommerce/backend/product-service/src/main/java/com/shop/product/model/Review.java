package com.shop.product.model;

import jakarta.persistence.*;

@Entity
@Table(name = "reviews")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long productId;
    private Long userId;
    private int rating;
    private String content;
}
