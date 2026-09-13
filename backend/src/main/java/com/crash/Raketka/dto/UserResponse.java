package com.crash.Raketka.dto;

import java.util.Map;

public record UserResponse(Long userId, String username,
                           int balance, int points,
                           // {"PUZZLE_A": 2, "PUZZLE_B": 0, ...} — сколько штук
                           // каждого фрагмента накоплено навсегда (см. User.java).
                           Map<String, Integer> puzzlePieces,
                           int setsCompleted) {
}
