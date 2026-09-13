package com.crash.Raketka.dto;

import com.crash.Raketka.domain.Theme;

public record HistoryItemResponse(
        String username,
        Theme theme,
        int betAmount,
        Double cashoutMultiplier,
        double crashMultiplier,
        String result,
        int pointsEarned
) {
}
