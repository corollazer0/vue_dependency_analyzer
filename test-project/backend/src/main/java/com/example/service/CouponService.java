package com.example.service;

import com.example.model.Coupon;
import com.example.repository.CouponRepository;
import com.example.service.UploadService;
import com.example.service.AuthService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final UploadService uploadService;
    private final AuthService authService;

    public CouponService(CouponRepository couponRepository, UploadService uploadService, AuthService authService) {
        this.couponRepository = couponRepository;
        this.uploadService = uploadService;
        this.authService = authService;
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
