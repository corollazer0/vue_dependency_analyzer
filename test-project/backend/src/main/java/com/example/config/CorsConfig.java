package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class CorsConfig {

    @Bean
    public String corsBean() {
        return "Cors";
    }
}
