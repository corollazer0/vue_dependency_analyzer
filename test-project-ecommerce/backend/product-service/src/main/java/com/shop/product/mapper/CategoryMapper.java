package com.shop.product.mapper;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CategoryMapper {
    Category findById(Long id);
    List<Category> findAll();
    void insert(Category entity);
    void update(Category entity);
    void deleteById(Long id);
}
