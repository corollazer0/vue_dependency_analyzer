package com.example.service;

import com.example.model.Search;
import com.example.repository.SearchRepository;
import com.example.service.UserService;
import com.example.service.InventoryService;
import com.example.service.NotificationService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SearchService {

    private final SearchRepository searchRepository;
    private final UserService userService;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;


    public SearchService(SearchRepository searchRepository, UserService userService, InventoryService inventoryService, NotificationService notificationService) {
        this.searchRepository = searchRepository;
        this.userService = userService;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
    }

    public List<Search> findAll() {
        return searchRepository.findAll();
    }

    public Optional<Search> findById(Long id) {
        return searchRepository.findById(id);
    }

    public Search save(Search entity) {
        return searchRepository.save(entity);
    }

    public void deleteById(Long id) {
        searchRepository.deleteById(id);
    }

}
