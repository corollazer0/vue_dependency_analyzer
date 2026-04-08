package com.shop.product.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.product.service.ProductService;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;
    public ProductController(ProductService productService) { this.productService = productService; }

    @GetMapping("")
    public ResponseEntity<List<ProductResponse>> getProduct() {
        return ResponseEntity.ok(productService.handle());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductid(@PathVariable Long id) {
        return ResponseEntity.ok(productService.handle());
    }

    @PostMapping("")
    public ResponseEntity<ProductResponse> postProduct(@RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.handle());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> putProductid(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.handle());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteProductid(@PathVariable Long id) {
        return ResponseEntity.ok(productService.handle());
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ReviewResponse>> getProductidreviews(@PathVariable Long id) {
        return ResponseEntity.ok(productService.handle());
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<ReviewResponse> postProductidreviews(@PathVariable Long id, @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(productService.handle());
    }
}
