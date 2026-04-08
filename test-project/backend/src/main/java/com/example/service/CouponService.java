package com.example.service;

import com.example.model.Coupon;
import com.example.repository.CouponRepository;
import com.example.service.PaymentService;
import com.example.service.CartService;
import com.example.service.OrderService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final PaymentService paymentService;
    private final CartService cartService;
    private final OrderService orderService;


    public CouponService(CouponRepository couponRepository, PaymentService paymentService, CartService cartService, OrderService orderService) {
        this.couponRepository = couponRepository;
        this.paymentService = paymentService;
        this.cartService = cartService;
        this.orderService = orderService;
    }

    public List<Coupon> findAll() {
        return couponRepository.findAll();
    }

    public Optional<Coupon> findById(Long id) {
        return couponRepository.findById(id);
    }

    public Coupon save(Coupon entity) {
        return couponRepository.save(entity);
    }

    public void deleteById(Long id) {
        couponRepository.deleteById(id);
    }

}
