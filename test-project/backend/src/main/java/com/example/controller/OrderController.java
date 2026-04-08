package com.example.controller;

import com.example.service.OrderService;
import com.example.model.Order;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("")
    public ResponseEntity<List<Order>> getOrder() {
        return ResponseEntity.ok(orderService.getOrder());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder1(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder1(id));
    }

    @PostMapping("")
    public ResponseEntity<Order> postOrder2(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.postOrder2());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> putOrder3(@PathVariable Long id, @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.putOrder3(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Order> postOrder4(@PathVariable Long id, @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.postOrder4(id));
    }
}
