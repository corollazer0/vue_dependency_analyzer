package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class RedisConfig {

    @Bean
    public String redisBean() {
        return "Redis";
    }
}
