package com.shop.product.mapper;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ProductMapper {
    Product findById(Long id);
    List<Product> findAll();
    void insert(Product entity);
    void update(Product entity);
    void deleteById(Long id);
}
