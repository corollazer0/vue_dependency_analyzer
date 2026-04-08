package com.shop.user.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String email;
    private String passwordHash;
    private String displayName;
    private String role;
    private boolean isActive;
    private String lastLoginIp;
}
