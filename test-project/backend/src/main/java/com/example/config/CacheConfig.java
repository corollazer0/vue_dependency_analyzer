package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class CacheConfig {

    @Bean
    public String cacheBean() {
        return "Cache";
    }
}
