package com.shop.product.service;

import org.springframework.stereotype.Service;
import org.springframework.context.event.EventListener;

@Service
public class SearchService {
    private final ProductRepository productRepository;

    @EventListener
    public void handleProductUpdatedEvent(ProductUpdatedEvent event) {
        // handle event
    }
}
