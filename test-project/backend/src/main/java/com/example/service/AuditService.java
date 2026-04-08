package com.example.service;

import com.example.model.Audit;
import com.example.repository.AuditRepository;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AuditService {

    private final AuditRepository auditRepository;


    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    public List<Audit> findAll() {
        return auditRepository.findAll();
    }

    public Optional<Audit> findById(Long id) {
        return auditRepository.findById(id);
    }

    public Audit save(Audit entity) {
        return auditRepository.save(entity);
    }

    public void deleteById(Long id) {
        auditRepository.deleteById(id);
    }
}
