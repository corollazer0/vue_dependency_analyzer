package com.shop.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryService categoryService;
    private final ApplicationEventPublisher eventPublisher;

    public void doAction() {
        eventPublisher.publishEvent(new ProductUpdatedEvent());
    }
}
