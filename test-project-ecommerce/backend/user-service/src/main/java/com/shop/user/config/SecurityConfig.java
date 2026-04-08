package com.shop.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return null; // configured externally
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        return null; // configured externally
    }
}
