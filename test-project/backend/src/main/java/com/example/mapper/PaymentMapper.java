package com.example.mapper;

import com.example.model.Payment;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface PaymentMapper {

    Payment findById(Long id);

    List<Payment> findAll();

    void insert(Payment payment);

    void update(Payment payment);

    void deleteById(Long id);
}
