package com.example.repository;

import com.example.model.Shipping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShippingRepository extends JpaRepository<Shipping, Long> {

    List<Shipping> findByName(String name);
}
