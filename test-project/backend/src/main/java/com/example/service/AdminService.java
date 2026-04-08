package com.example.service;

import com.example.model.Admin;
import com.example.repository.AdminRepository;
import com.example.service.NotificationService;
import com.example.service.SearchService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AdminService {

    private final AdminRepository adminRepository;
    private final NotificationService notificationService;
    private final SearchService searchService;


    public AdminService(AdminRepository adminRepository, NotificationService notificationService, SearchService searchService) {
        this.adminRepository = adminRepository;
        this.notificationService = notificationService;
        this.searchService = searchService;
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
