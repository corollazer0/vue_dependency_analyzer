package com.example.service;

import com.example.model.Notification;
import com.example.repository.NotificationRepository;
import com.example.service.UserService;
import com.example.service.ProductService;
import com.example.service.ReviewService;
import com.example.event.OrderCreatedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;
    private final ProductService productService;
    private final ReviewService reviewService;


    public NotificationService(NotificationRepository notificationRepository, UserService userService, ProductService productService, ReviewService reviewService) {
        this.notificationRepository = notificationRepository;
        this.userService = userService;
        this.productService = productService;
        this.reviewService = reviewService;
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

    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Send notification when order is created
        System.out.println("Order created: " + event.getOrderId());
    }
}
