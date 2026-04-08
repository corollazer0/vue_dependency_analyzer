package com.example.service;

import com.example.model.Product;
import com.example.repository.ProductRepository;
import com.example.service.UserService;
import com.example.service.DashboardService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final UserService userService;
    private final DashboardService dashboardService;


    public List<Product> findAll() {
        return productRepository.findAll();
    }

    public Optional<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    public Product save(Product entity) {
        return productRepository.save(entity);
    }

    public void deleteById(Long id) {
        productRepository.deleteById(id);
    }

}
