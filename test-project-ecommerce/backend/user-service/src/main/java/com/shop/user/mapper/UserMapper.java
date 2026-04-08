package com.shop.user.mapper;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface UserMapper {
    User findById(Long id);
    List<User> findAll();
    void insert(User entity);
    void update(User entity);
    void deleteById(Long id);
}
