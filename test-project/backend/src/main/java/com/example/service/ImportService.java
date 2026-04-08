package com.example.service;

import com.example.model.Import;
import com.example.repository.ImportRepository;
import com.example.service.WishlistService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ImportService {

    private final ImportRepository importRepository;
    private final WishlistService wishlistService;

    public ImportService(ImportRepository importRepository, WishlistService wishlistService) {
        this.importRepository = importRepository;
        this.wishlistService = wishlistService;
    }

    public List<Import> findAll() {
        return importRepository.findAll();
    }

    public Optional<Import> findById(Long id) {
        return importRepository.findById(id);
    }

    public Import save(Import entity) {
        return importRepository.save(entity);
    }

    public void deleteById(Long id) {
        importRepository.deleteById(id);
    }
}
