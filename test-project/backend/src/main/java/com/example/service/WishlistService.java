package com.example.service;

import com.example.model.Wishlist;
import com.example.repository.WishlistRepository;
import com.example.service.CouponService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final CouponService couponService;


    public WishlistService(WishlistRepository wishlistRepository, CouponService couponService) {
        this.wishlistRepository = wishlistRepository;
        this.couponService = couponService;
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
