package com.shop.product.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.shop.product.service.CategoryService;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    private final CategoryService categoryService;
    public CategoryController(CategoryService categoryService) { this.categoryService = categoryService; }

    @GetMapping("")
    public ResponseEntity<List<CategoryResponse>> getCategory() {
        return ResponseEntity.ok(categoryService.handle());
    }

    @GetMapping("/tree")
    public ResponseEntity<List<CategoryTreeResponse>> getCategorytree() {
        return ResponseEntity.ok(categoryService.handle());
    }

    @PostMapping("")
    public ResponseEntity<CategoryResponse> postCategory(@RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.handle());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> putCategoryid(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.handle());
    }
}
