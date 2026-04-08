package com.shop.user.event;

public class UserRegisteredEvent {
    private final Long userId;
    private final String email;
    public UserRegisteredEvent(Long userId, String email) {
        this.userId = userId; this.email = email;
    }
}
