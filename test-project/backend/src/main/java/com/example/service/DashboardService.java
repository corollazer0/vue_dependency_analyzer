package com.example.service;

import com.example.model.Dashboard;
import com.example.repository.DashboardRepository;
import com.example.service.ShippingService;
import com.example.service.PaymentService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final ShippingService shippingService;
    private final PaymentService paymentService;

    public DashboardService(DashboardRepository dashboardRepository, ShippingService shippingService, PaymentService paymentService) {
        this.dashboardRepository = dashboardRepository;
        this.shippingService = shippingService;
        this.paymentService = paymentService;
    }

    public List<Dashboard> findAll() {
        return dashboardRepository.findAll();
    }

    public Optional<Dashboard> findById(Long id) {
        return dashboardRepository.findById(id);
    }

    public Dashboard save(Dashboard entity) {
        return dashboardRepository.save(entity);
    }

    public void deleteById(Long id) {
        dashboardRepository.deleteById(id);
    }
}
