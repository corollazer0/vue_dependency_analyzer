package com.example.service;

import com.example.model.Email;
import com.example.repository.EmailRepository;
import com.example.service.ReportService;
import com.example.service.AuthService;
import com.example.service.SearchService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EmailService {

    private final EmailRepository emailRepository;
    private final ReportService reportService;
    private final AuthService authService;
    private final SearchService searchService;


    public EmailService(EmailRepository emailRepository, ReportService reportService, AuthService authService, SearchService searchService) {
        this.emailRepository = emailRepository;
        this.reportService = reportService;
        this.authService = authService;
        this.searchService = searchService;
    }

    public List<Email> findAll() {
        return emailRepository.findAll();
    }

    public Optional<Email> findById(Long id) {
        return emailRepository.findById(id);
    }

    public Email save(Email entity) {
        return emailRepository.save(entity);
    }

    public void deleteById(Long id) {
        emailRepository.deleteById(id);
    }

}
