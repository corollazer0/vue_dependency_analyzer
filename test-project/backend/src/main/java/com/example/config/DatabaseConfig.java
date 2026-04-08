package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class DatabaseConfig {

    @Bean
    public String databaseBean() {
        return "Database";
    }
}
