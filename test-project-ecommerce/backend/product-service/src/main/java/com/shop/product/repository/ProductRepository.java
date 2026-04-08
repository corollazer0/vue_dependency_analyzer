package com.shop.product.repository;

import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository {
    Product findById(Long id);
    java.util.List<Product> findAll();
    void save(Product entity);
    void deleteById(Long id);
}
