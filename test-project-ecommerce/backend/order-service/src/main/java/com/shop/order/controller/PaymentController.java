package com.shop.order.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.order.service.PaymentService;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;
    public PaymentController(PaymentService paymentService) { this.paymentService = paymentService; }

    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> postPaymentprocess(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.handle());
    }

    @PostMapping("/refund")
    public ResponseEntity<RefundResponse> postPaymentrefund(@RequestBody RefundRequest request) {
        return ResponseEntity.ok(paymentService.handle());
    }
}
