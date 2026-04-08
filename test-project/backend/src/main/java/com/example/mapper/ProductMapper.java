package com.example.mapper;

import com.example.model.Product;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ProductMapper {

    Product findById(Long id);

    List<Product> findAll();

    void insert(Product product);

    void update(Product product);

    void deleteById(Long id);
}
