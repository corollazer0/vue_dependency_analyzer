package com.example.service;

import com.example.model.Shipping;
import com.example.repository.ShippingRepository;
import com.example.service.CouponService;
import com.example.service.AdminService;
import com.example.service.SettingsService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ShippingService {

    private final ShippingRepository shippingRepository;
    private final CouponService couponService;
    private final AdminService adminService;
    private final SettingsService settingsService;


    public ShippingService(ShippingRepository shippingRepository, CouponService couponService, AdminService adminService, SettingsService settingsService) {
        this.shippingRepository = shippingRepository;
        this.couponService = couponService;
        this.adminService = adminService;
        this.settingsService = settingsService;
    }

    public List<Shipping> findAll() {
        return shippingRepository.findAll();
    }

    public Optional<Shipping> findById(Long id) {
        return shippingRepository.findById(id);
    }

    public Shipping save(Shipping entity) {
        return shippingRepository.save(entity);
    }

    public void deleteById(Long id) {
        shippingRepository.deleteById(id);
    }

}
