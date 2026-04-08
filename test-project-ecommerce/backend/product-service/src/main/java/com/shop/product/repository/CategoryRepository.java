package com.shop.product.repository;

import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository {
    Category findById(Long id);
    java.util.List<Category> findAll();
    void save(Category entity);
    void deleteById(Long id);
}
