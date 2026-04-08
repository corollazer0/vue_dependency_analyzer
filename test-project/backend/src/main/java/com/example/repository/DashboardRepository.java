package com.example.repository;

import com.example.model.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Dashboard, Long> {

    List<Dashboard> findByName(String name);
}
