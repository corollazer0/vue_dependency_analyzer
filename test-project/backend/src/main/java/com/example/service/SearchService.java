package com.example.service;

import com.example.model.Search;
import com.example.repository.SearchRepository;
import com.example.service.ProductService;
import com.example.service.OrderService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SearchService {

    private final SearchRepository searchRepository;
    private final ProductService productService;
    private final OrderService orderService;

    public SearchService(SearchRepository searchRepository, ProductService productService, OrderService orderService) {
        this.searchRepository = searchRepository;
        this.productService = productService;
        this.orderService = orderService;
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
