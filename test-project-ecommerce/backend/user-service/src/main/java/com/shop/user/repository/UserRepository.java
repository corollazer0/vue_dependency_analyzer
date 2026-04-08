package com.shop.user.repository;

import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository {
    User findById(Long id);
    java.util.List<User> findAll();
    void save(User entity);
    void deleteById(Long id);
}
