package com.crash.Raketka.dto;

import com.crash.Raketka.domain.Theme;

import java.time.Instant;
import java.util.List;

public record StartRoundResponse(
        Long roundId,
        String seedHash,
        Instant startedAt,
        Theme theme,
        int levelsTotal,
        int betAmount,
        int boosterValue,
        List<Double> levelThresholds
) {
}
