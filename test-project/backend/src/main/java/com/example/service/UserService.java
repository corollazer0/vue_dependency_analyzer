package com.example.service;

import com.example.model.User;
import com.example.repository.UserRepository;
import com.example.service.DashboardService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final DashboardService dashboardService;


    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User save(User entity) {
        return userRepository.save(entity);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

}
