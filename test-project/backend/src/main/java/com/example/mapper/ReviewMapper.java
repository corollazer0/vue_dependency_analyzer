package com.example.mapper;

import com.example.model.Review;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ReviewMapper {

    Review findById(Long id);

    List<Review> findAll();

    void insert(Review review);

    void update(Review review);

    void deleteById(Long id);
}
