package com.example.controller;

import com.example.service.NotificationService;
import com.example.model.Notification;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("")
    public ResponseEntity<List<Notification>> getNotification() {
        return ResponseEntity.ok(notificationService.getNotification());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Notification> getNotification1(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.getNotification1(id));
    }

    @PostMapping("")
    public ResponseEntity<Notification> postNotification2(@RequestBody NotificationRequest request) {
        return ResponseEntity.ok(notificationService.postNotification2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Notification> putNotification3(@PathVariable Long id, @RequestBody NotificationRequest request) {
        return ResponseEntity.ok(notificationService.putNotification3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteNotification4(@PathVariable Long id) {
        notificationService.deleteNotification4(id);
        return ResponseEntity.noContent().build();
    }
}
