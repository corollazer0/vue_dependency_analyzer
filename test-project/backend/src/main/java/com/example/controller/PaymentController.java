package com.example.controller;

import com.example.service.PaymentService;
import com.example.model.Payment;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("")
    public ResponseEntity<List<Payment>> getPayment() {
        return ResponseEntity.ok(paymentService.getPayment());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPayment1(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPayment1(id));
    }

    @PostMapping("")
    public ResponseEntity<Payment> postPayment2(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.postPayment2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Payment> putPayment3(@PathVariable Long id, @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.putPayment3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deletePayment4(@PathVariable Long id) {
        paymentService.deletePayment4(id);
        return ResponseEntity.noContent().build();
    }
}
