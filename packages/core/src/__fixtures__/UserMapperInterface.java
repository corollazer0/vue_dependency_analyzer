package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;
import com.example.model.User;
import java.util.List;

@Mapper
public interface UserMapper {
    User findById(Long id);
    List<User> findAll();
    void insert(User user);
    void update(User user);
    void deleteById(Long id);
}
