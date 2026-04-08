package com.example.controller;

import com.example.service.ReviewService;
import com.example.model.Review;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("")
    public ResponseEntity<List<Review>> getReview() {
        return ResponseEntity.ok(reviewService.getReview());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Review> getReview1(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getReview1(id));
    }

    @PostMapping("")
    public ResponseEntity<Review> postReview2(@RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.postReview2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Review> putReview3(@PathVariable Long id, @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.putReview3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteReview4(@PathVariable Long id) {
        reviewService.deleteReview4(id);
        return ResponseEntity.noContent().build();
    }
}
