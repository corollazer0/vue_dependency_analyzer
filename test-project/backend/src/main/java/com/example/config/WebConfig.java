package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class WebConfig {

    @Bean
    public String webBean() {
        return "Web";
    }
}
