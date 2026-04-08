package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class S3Config {

    @Bean
    public String s3Bean() {
        return "S3";
    }
}
