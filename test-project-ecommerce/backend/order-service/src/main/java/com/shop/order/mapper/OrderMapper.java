package com.shop.order.mapper;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface OrderMapper {
    Order findById(Long id);
    List<Order> findAll();
    void insert(Order entity);
    void update(Order entity);
    void deleteById(Long id);
}
