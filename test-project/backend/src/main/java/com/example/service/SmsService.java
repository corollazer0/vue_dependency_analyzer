package com.example.service;

import com.example.model.Sms;
import com.example.repository.SmsRepository;
import com.example.service.ReviewService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SmsService {

    private final SmsRepository smsRepository;
    private final ReviewService reviewService;


    public SmsService(SmsRepository smsRepository, ReviewService reviewService) {
        this.smsRepository = smsRepository;
        this.reviewService = reviewService;
    }

    public List<Sms> findAll() {
        return smsRepository.findAll();
    }

    public Optional<Sms> findById(Long id) {
        return smsRepository.findById(id);
    }

    public Sms save(Sms entity) {
        return smsRepository.save(entity);
    }

    public void deleteById(Long id) {
        smsRepository.deleteById(id);
    }

}
