package com.example.service;

import com.example.model.Category;
import com.example.repository.CategoryRepository;
import com.example.service.ReviewService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ReviewService reviewService;


    public CategoryService(CategoryRepository categoryRepository, ReviewService reviewService) {
        this.categoryRepository = categoryRepository;
        this.reviewService = reviewService;
    }

    public List<Category> findAll() {
        return categoryRepository.findAll();
    }

    public Optional<Category> findById(Long id) {
        return categoryRepository.findById(id);
    }

    public Category save(Category entity) {
        return categoryRepository.save(entity);
    }

    public void deleteById(Long id) {
        categoryRepository.deleteById(id);
    }

}
