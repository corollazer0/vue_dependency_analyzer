package com.example.controller;

import com.example.service.CategoryService;
import com.example.model.Category;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/categorys")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("")
    public ResponseEntity<List<Category>> getCategory() {
        return ResponseEntity.ok(categoryService.getCategory());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategory1(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategory1(id));
    }

    @PostMapping("")
    public ResponseEntity<Category> postCategory2(@RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.postCategory2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> putCategory3(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.putCategory3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteCategory4(@PathVariable Long id) {
        categoryService.deleteCategory4(id);
        return ResponseEntity.noContent().build();
    }
}
