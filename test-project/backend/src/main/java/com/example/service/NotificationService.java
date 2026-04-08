package com.example.service;

import com.example.model.Notification;
import com.example.repository.NotificationRepository;
import com.example.service.ReviewService;
import com.example.service.UserService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ReviewService reviewService;
    private final UserService userService;

    public NotificationService(NotificationRepository notificationRepository, ReviewService reviewService, UserService userService) {
        this.notificationRepository = notificationRepository;
        this.reviewService = reviewService;
        this.userService = userService;
    }

    public List<Notification> findAll() {
        return notificationRepository.findAll();
    }

    public Optional<Notification> findById(Long id) {
        return notificationRepository.findById(id);
    }

    public Notification save(Notification entity) {
        return notificationRepository.save(entity);
    }

    public void deleteById(Long id) {
        notificationRepository.deleteById(id);
    }
}
