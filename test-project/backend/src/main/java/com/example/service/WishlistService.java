package com.example.service;

import com.example.model.Wishlist;
import com.example.repository.WishlistRepository;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;


    public WishlistService(WishlistRepository wishlistRepository) {
        this.wishlistRepository = wishlistRepository;
    }

    public List<Wishlist> findAll() {
        return wishlistRepository.findAll();
    }

    public Optional<Wishlist> findById(Long id) {
        return wishlistRepository.findById(id);
    }

    public Wishlist save(Wishlist entity) {
        return wishlistRepository.save(entity);
    }

    public void deleteById(Long id) {
        wishlistRepository.deleteById(id);
    }
}
