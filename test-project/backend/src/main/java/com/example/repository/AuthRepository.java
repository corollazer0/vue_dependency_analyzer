package com.example.repository;

import com.example.model.Auth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuthRepository extends JpaRepository<Auth, Long> {

    List<Auth> findByName(String name);
}
