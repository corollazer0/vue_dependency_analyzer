package com.example.service;

import com.example.model.Cart;
import com.example.repository.CartRepository;
import com.example.service.CategoryService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CategoryService categoryService;


    public List<Cart> findAll() {
        return cartRepository.findAll();
    }

    public Optional<Cart> findById(Long id) {
        return cartRepository.findById(id);
    }

    public Cart save(Cart entity) {
        return cartRepository.save(entity);
    }

    public void deleteById(Long id) {
        cartRepository.deleteById(id);
    }

}
