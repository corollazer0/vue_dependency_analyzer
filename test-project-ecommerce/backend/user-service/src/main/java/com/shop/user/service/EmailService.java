package com.shop.user.service;

import org.springframework.stereotype.Service;
import org.springframework.context.event.EventListener;

@Service
public class EmailService {


    @EventListener
    public void handleUserRegisteredEvent(UserRegisteredEvent event) {
        // handle event
    }
}
