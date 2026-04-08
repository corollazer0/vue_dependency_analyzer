package com.example.controller;

import com.example.service.ShippingService;
import com.example.model.Shipping;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/shippings")
public class ShippingController {

    private final ShippingService shippingService;

    public ShippingController(ShippingService shippingService) {
        this.shippingService = shippingService;
    }

    @GetMapping("")
    public ResponseEntity<List<Shipping>> getShipping() {
        return ResponseEntity.ok(shippingService.getShipping());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shipping> getShipping1(@PathVariable Long id) {
        return ResponseEntity.ok(shippingService.getShipping1(id));
    }

    @PostMapping("")
    public ResponseEntity<Shipping> postShipping2(@RequestBody ShippingRequest request) {
        return ResponseEntity.ok(shippingService.postShipping2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shipping> putShipping3(@PathVariable Long id, @RequestBody ShippingRequest request) {
        return ResponseEntity.ok(shippingService.putShipping3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteShipping4(@PathVariable Long id) {
        shippingService.deleteShipping4(id);
        return ResponseEntity.noContent().build();
    }
}
