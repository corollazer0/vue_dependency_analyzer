package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class JacksonConfig {

    @Bean
    public String jacksonBean() {
        return "Jackson";
    }
}
