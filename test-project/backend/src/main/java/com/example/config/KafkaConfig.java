package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class KafkaConfig {

    @Bean
    public String kafkaBean() {
        return "Kafka";
    }
}
