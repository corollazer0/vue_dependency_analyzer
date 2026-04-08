package com.example.service;

import com.example.model.Product;
import com.example.repository.ProductRepository;
import com.example.service.NotificationService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    public ProductService(ProductRepository productRepository, NotificationService notificationService) {
        this.productRepository = productRepository;
        this.notificationService = notificationService;
    }

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
