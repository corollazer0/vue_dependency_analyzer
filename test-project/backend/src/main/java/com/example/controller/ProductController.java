package com.example.controller;

import com.example.service.ProductService;
import com.example.model.Product;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("")
    public ResponseEntity<List<Product>> getProduct() {
        return ResponseEntity.ok(productService.getProduct());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct1(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProduct1(id));
    }

    @PostMapping("")
    public ResponseEntity<Product> postProduct2(@RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.postProduct2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> putProduct3(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.putProduct3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteProduct4(@PathVariable Long id) {
        productService.deleteProduct4(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<Review>> getProduct5(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProduct5(id));
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<Review> postProduct6(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.postProduct6(id));
    }
}
