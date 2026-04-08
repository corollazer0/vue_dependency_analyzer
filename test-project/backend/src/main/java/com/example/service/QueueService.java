package com.example.service;

import com.example.model.Queue;
import com.example.repository.QueueRepository;
import com.example.service.CategoryService;
import com.example.service.NotificationService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class QueueService {

    private final QueueRepository queueRepository;
    private final CategoryService categoryService;
    private final NotificationService notificationService;

    public QueueService(QueueRepository queueRepository, CategoryService categoryService, NotificationService notificationService) {
        this.queueRepository = queueRepository;
        this.categoryService = categoryService;
        this.notificationService = notificationService;
    }

    public List<Queue> findAll() {
        return queueRepository.findAll();
    }

    public Optional<Queue> findById(Long id) {
        return queueRepository.findById(id);
    }

    public Queue save(Queue entity) {
        return queueRepository.save(entity);
    }

    public void deleteById(Long id) {
        queueRepository.deleteById(id);
    }
}
