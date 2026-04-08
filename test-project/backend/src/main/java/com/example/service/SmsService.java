package com.example.service;

import com.example.model.Sms;
import com.example.repository.SmsRepository;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SmsService {

    private final SmsRepository smsRepository;


    public SmsService(SmsRepository smsRepository) {
        this.smsRepository = smsRepository;
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
