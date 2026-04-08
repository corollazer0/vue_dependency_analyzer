package com.example.mapper;

import com.example.model.Inventory;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface InventoryMapper {

    Inventory findById(Long id);

    List<Inventory> findAll();

    void insert(Inventory inventory);

    void update(Inventory inventory);

    void deleteById(Long id);
}
