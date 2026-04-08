package com.shop.product.model;

import jakarta.persistence.*;

@Entity
@Table(name = "categorys")
public class Category {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private Long parentId;
    private int sortOrder;
}
