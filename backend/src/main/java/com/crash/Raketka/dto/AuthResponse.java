package com.crash.Raketka.dto;

public record AuthResponse(Long userId, String username, int balance,
                           int points, String token) {
}