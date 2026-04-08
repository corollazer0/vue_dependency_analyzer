package com.example.controller;

import com.example.service.WishlistService;
import com.example.model.Wishlist;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/wishlists")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping("")
    public ResponseEntity<List<Wishlist>> getWishlist() {
        return ResponseEntity.ok(wishlistService.getWishlist());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Wishlist> getWishlist1(@PathVariable Long id) {
        return ResponseEntity.ok(wishlistService.getWishlist1(id));
    }

    @PostMapping("")
    public ResponseEntity<Wishlist> postWishlist2(@RequestBody WishlistRequest request) {
        return ResponseEntity.ok(wishlistService.postWishlist2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Wishlist> putWishlist3(@PathVariable Long id, @RequestBody WishlistRequest request) {
        return ResponseEntity.ok(wishlistService.putWishlist3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteWishlist4(@PathVariable Long id) {
        wishlistService.deleteWishlist4(id);
        return ResponseEntity.noContent().build();
    }
}
