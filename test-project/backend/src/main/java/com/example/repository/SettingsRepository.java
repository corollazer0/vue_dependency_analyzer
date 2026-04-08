package com.example.repository;

import com.example.model.Settings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SettingsRepository extends JpaRepository<Settings, Long> {

    List<Settings> findByName(String name);
}
