package com.example.mapper;

import com.example.model.Category;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CategoryMapper {

    Category findById(Long id);

    List<Category> findAll();

    void insert(Category category);

    void update(Category category);

    void deleteById(Long id);
}
