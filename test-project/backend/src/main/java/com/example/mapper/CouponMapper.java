package com.example.mapper;

import com.example.model.Coupon;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CouponMapper {

    Coupon findById(Long id);

    List<Coupon> findAll();

    void insert(Coupon coupon);

    void update(Coupon coupon);

    void deleteById(Long id);
}
