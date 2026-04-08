package com.example.service;

import com.example.model.Payment;
import com.example.repository.PaymentRepository;
import com.example.service.NotificationService;
import com.example.service.CouponService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final CouponService couponService;


    public List<Payment> findAll() {
        return paymentRepository.findAll();
    }

    public Optional<Payment> findById(Long id) {
        return paymentRepository.findById(id);
    }

    public Payment save(Payment entity) {
        return paymentRepository.save(entity);
    }

    public void deleteById(Long id) {
        paymentRepository.deleteById(id);
    }

}
