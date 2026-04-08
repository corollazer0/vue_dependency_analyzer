package com.example.service;

import com.example.model.Email;
import com.example.repository.EmailRepository;
import com.example.service.CategoryService;
import com.example.service.ReviewService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EmailService {

    private final EmailRepository emailRepository;
    private final CategoryService categoryService;
    private final ReviewService reviewService;

    public EmailService(EmailRepository emailRepository, CategoryService categoryService, ReviewService reviewService) {
        this.emailRepository = emailRepository;
        this.categoryService = categoryService;
        this.reviewService = reviewService;
    }

    public List<Email> findAll() {
        return emailRepository.findAll();
    }

    public Optional<Email> findById(Long id) {
        return emailRepository.findById(id);
    }

    public Email save(Email entity) {
        return emailRepository.save(entity);
    }

    public void deleteById(Long id) {
        emailRepository.deleteById(id);
    }
}
