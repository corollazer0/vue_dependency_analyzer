package com.example.mapper;

import com.example.model.Wishlist;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface WishlistMapper {

    Wishlist findById(Long id);

    List<Wishlist> findAll();

    void insert(Wishlist wishlist);

    void update(Wishlist wishlist);

    void deleteById(Long id);
}
