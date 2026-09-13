package com.crash.Raketka.dto;

import java.util.List;
import java.util.Map;

/**
 * Публичная проекция {@link com.crash.Raketka.config.GameConfig} для клиента
 * (см. GET /api/config/public, без auth). Внутренняя математика — houseEdge,
 * minCrashMultiplier, maxMultiplier, multiplierGrowthRate, lineProbabilities,
 * fixedSeed — сюда не попадает: клиент не должен знать распределение краха
 * или вероятности бустера, иначе честность результата теряет смысл.
 */
public record PublicConfigResponse(
        String gameId,
        String gameName,
        String gameType,
        boolean isActive,
        int startingBalance,
        int pointsPerLine,
        int pointsCashoutBonus,
        int pointsBoosterBonus,
        int pointsSetCompleteBonus,
        List<FragmentDto> fragments,
        Map<String, ThemePublicDto> themes
) {
    public record FragmentDto(int id, int betAmount, int boosterValue) {
    }

    public record ThemePublicDto(int levelsTotal, List<Double> levelThresholds) {
    }
}
