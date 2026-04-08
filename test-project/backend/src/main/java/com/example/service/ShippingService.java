package com.example.service;

import com.example.model.Shipping;
import com.example.repository.ShippingRepository;
import com.example.service.AdminService;
import com.example.service.ReviewService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ShippingService {

    private final ShippingRepository shippingRepository;
    private final AdminService adminService;
    private final ReviewService reviewService;

    public ShippingService(ShippingRepository shippingRepository, AdminService adminService, ReviewService reviewService) {
        this.shippingRepository = shippingRepository;
        this.adminService = adminService;
        this.reviewService = reviewService;
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
