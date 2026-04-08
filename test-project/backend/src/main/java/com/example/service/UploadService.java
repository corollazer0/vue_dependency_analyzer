package com.example.service;

import com.example.model.Upload;
import com.example.repository.UploadRepository;
import com.example.service.DashboardService;
import com.example.service.PaymentService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UploadService {

    private final UploadRepository uploadRepository;
    private final DashboardService dashboardService;
    private final PaymentService paymentService;


    public UploadService(UploadRepository uploadRepository, DashboardService dashboardService, PaymentService paymentService) {
        this.uploadRepository = uploadRepository;
        this.dashboardService = dashboardService;
        this.paymentService = paymentService;
    }

    public List<Upload> findAll() {
        return uploadRepository.findAll();
    }

    public Optional<Upload> findById(Long id) {
        return uploadRepository.findById(id);
    }

    public Upload save(Upload entity) {
        return uploadRepository.save(entity);
    }

    public void deleteById(Long id) {
        uploadRepository.deleteById(id);
    }

}
