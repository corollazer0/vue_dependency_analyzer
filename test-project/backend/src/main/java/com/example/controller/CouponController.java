package com.example.controller;

import com.example.service.CouponService;
import com.example.model.Coupon;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping("")
    public ResponseEntity<List<Coupon>> getCoupon() {
        return ResponseEntity.ok(couponService.getCoupon());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Coupon> getCoupon1(@PathVariable Long id) {
        return ResponseEntity.ok(couponService.getCoupon1(id));
    }

    @PostMapping("")
    public ResponseEntity<Coupon> postCoupon2(@RequestBody CouponRequest request) {
        return ResponseEntity.ok(couponService.postCoupon2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Coupon> putCoupon3(@PathVariable Long id, @RequestBody CouponRequest request) {
        return ResponseEntity.ok(couponService.putCoupon3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteCoupon4(@PathVariable Long id) {
        couponService.deleteCoupon4(id);
        return ResponseEntity.noContent().build();
    }
}
