package com.example.service;

import com.example.model.Scheduler;
import com.example.repository.SchedulerRepository;
import com.example.service.CategoryService;
import com.example.service.NotificationService;
import com.example.service.ReviewService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SchedulerService {

    private final SchedulerRepository schedulerRepository;
    private final CategoryService categoryService;
    private final NotificationService notificationService;
    private final ReviewService reviewService;


    public SchedulerService(SchedulerRepository schedulerRepository, CategoryService categoryService, NotificationService notificationService, ReviewService reviewService) {
        this.schedulerRepository = schedulerRepository;
        this.categoryService = categoryService;
        this.notificationService = notificationService;
        this.reviewService = reviewService;
    }

    public List<Scheduler> findAll() {
        return schedulerRepository.findAll();
    }

    public Optional<Scheduler> findById(Long id) {
        return schedulerRepository.findById(id);
    }

    public Scheduler save(Scheduler entity) {
        return schedulerRepository.save(entity);
    }

    public void deleteById(Long id) {
        schedulerRepository.deleteById(id);
    }

}
