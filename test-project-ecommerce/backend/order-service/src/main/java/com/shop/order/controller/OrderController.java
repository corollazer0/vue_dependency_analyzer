package com.shop.order.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.order.service.OrderService;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;
    public OrderController(OrderService orderService) { this.orderService = orderService; }

    @GetMapping("")
    public ResponseEntity<List<OrderResponse>> getOrder() {
        return ResponseEntity.ok(orderService.handle());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderid(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.handle());
    }

    @PostMapping("")
    public ResponseEntity<OrderResponse> postOrder(@RequestBody CreateOrderRequest request) {
        return ResponseEntity.ok(orderService.handle());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> putOrderidstatus(@PathVariable Long id, @RequestBody UpdateStatusRequest request) {
        return ResponseEntity.ok(orderService.handle());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> postOrderidcancel(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.handle());
    }

    @GetMapping("/{id}/timeline")
    public ResponseEntity<List<TimelineEntry>> getOrderidtimeline(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.handle());
    }
}
