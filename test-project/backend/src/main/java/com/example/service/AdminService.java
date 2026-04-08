package com.example.service;

import com.example.model.Admin;
import com.example.repository.AdminRepository;
import com.example.service.ShippingService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AdminService {

    private final AdminRepository adminRepository;
    private final ShippingService shippingService;

    public AdminService(AdminRepository adminRepository, ShippingService shippingService) {
        this.adminRepository = adminRepository;
        this.shippingService = shippingService;
    }

    public List<Admin> findAll() {
        return adminRepository.findAll();
    }

    public Optional<Admin> findById(Long id) {
        return adminRepository.findById(id);
    }

    public Admin save(Admin entity) {
        return adminRepository.save(entity);
    }

    public void deleteById(Long id) {
        adminRepository.deleteById(id);
    }
}
