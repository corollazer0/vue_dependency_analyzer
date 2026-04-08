package com.shop.order.repository;

import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository {
    Order findById(Long id);
    java.util.List<Order> findAll();
    void save(Order entity);
    void deleteById(Long id);
}
