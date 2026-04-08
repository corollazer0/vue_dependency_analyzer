package com.example.service;

import com.example.model.Review;
import com.example.repository.ReviewRepository;
import com.example.service.SettingsService;
import com.example.service.InventoryService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final SettingsService settingsService;
    private final InventoryService inventoryService;


    public ReviewService(ReviewRepository reviewRepository, SettingsService settingsService, InventoryService inventoryService) {
        this.reviewRepository = reviewRepository;
        this.settingsService = settingsService;
        this.inventoryService = inventoryService;
    }

    public List<Review> findAll() {
        return reviewRepository.findAll();
    }

    public Optional<Review> findById(Long id) {
        return reviewRepository.findById(id);
    }

    public Review save(Review entity) {
        return reviewRepository.save(entity);
    }

    public void deleteById(Long id) {
        reviewRepository.deleteById(id);
    }

}
