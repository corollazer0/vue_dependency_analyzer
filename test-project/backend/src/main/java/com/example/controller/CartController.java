package com.example.controller;

import com.example.service.CartService;
import com.example.model.Cart;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping("")
    public ResponseEntity<Cart> getCart() {
        return ResponseEntity.ok(cartService.getCart());
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> postCart1(@RequestBody CartRequest request) {
        return ResponseEntity.ok(cartService.postCart1());
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Cart> deleteCart2(@PathVariable Long id) {
        return ResponseEntity.ok(cartService.deleteCart2(id));
    }
}
