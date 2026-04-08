package com.example.mapper;

import com.example.model.Cart;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CartMapper {

    Cart findById(Long id);

    List<Cart> findAll();

    void insert(Cart cart);

    void update(Cart cart);

    void deleteById(Long id);
}
