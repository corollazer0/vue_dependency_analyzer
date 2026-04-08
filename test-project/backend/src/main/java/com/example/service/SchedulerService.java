package com.example.service;

import com.example.model.Scheduler;
import com.example.repository.SchedulerRepository;
import com.example.service.SettingsService;
import com.example.service.OrderService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SchedulerService {

    private final SchedulerRepository schedulerRepository;
    private final SettingsService settingsService;
    private final OrderService orderService;

    public SchedulerService(SchedulerRepository schedulerRepository, SettingsService settingsService, OrderService orderService) {
        this.schedulerRepository = schedulerRepository;
        this.settingsService = settingsService;
        this.orderService = orderService;
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
