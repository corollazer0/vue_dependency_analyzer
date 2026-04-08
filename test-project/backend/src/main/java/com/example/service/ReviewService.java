package com.example.service;

import com.example.model.Review;
import com.example.repository.ReviewRepository;
import com.example.service.AdminService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AdminService adminService;

    public ReviewService(ReviewRepository reviewRepository, AdminService adminService) {
        this.reviewRepository = reviewRepository;
        this.adminService = adminService;
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
