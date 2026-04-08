package com.example.service;

import com.example.model.Export;
import com.example.repository.ExportRepository;
import com.example.service.UserService;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ExportService {

    private final ExportRepository exportRepository;
    private final UserService userService;


    public ExportService(ExportRepository exportRepository, UserService userService) {
        this.exportRepository = exportRepository;
        this.userService = userService;
    }

    public List<Export> findAll() {
        return exportRepository.findAll();
    }

    public Optional<Export> findById(Long id) {
        return exportRepository.findById(id);
    }

    public Export save(Export entity) {
        return exportRepository.save(entity);
    }

    public void deleteById(Long id) {
        exportRepository.deleteById(id);
    }

}
