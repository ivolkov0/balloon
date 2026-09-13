package com.crash.Raketka.controller;

import com.crash.Raketka.config.ConfigService;
import com.crash.Raketka.config.GameConfig;
import com.crash.Raketka.dto.PublicConfigResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Публичный конфиг для фронта — без auth (см. SecurityConfig: "/api/config/public"
 * в permitAll, вместе с "/api/auth/**"). Отдаёт только то, что нужно для
 * рендера экранов ДО старта раунда (фрагменты ставок, число уровней и их
 * пороги) — без внутренней математики (houseEdge, lineProbabilities и т.п.),
 * см. README бэкенда п.5.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/public")
    public PublicConfigResponse publicConfig() {
        GameConfig config = configService.get();

        List<PublicConfigResponse.FragmentDto> fragments = config.getFragments().stream()
                .map(f -> new PublicConfigResponse.FragmentDto(f.getId(), f.getBetAmount(), f.getBoosterValue()))
                .toList();

        Map<String, PublicConfigResponse.ThemePublicDto> themes = new LinkedHashMap<>();
        config.getThemes().forEach((name, theme) ->
                themes.put(name, new PublicConfigResponse.ThemePublicDto(theme.getLevelsTotal(), theme.getLevelThresholds())));

        return new PublicConfigResponse(
                config.getGameId(),
                config.getGameName(),
                config.getGameType(),
                config.isActive(),
                config.getStartingBalance(),
                config.getPointsPerLine(),
                config.getPointsCashoutBonus(),
                config.getPointsBoosterBonus(),
                config.getPointsSetCompleteBonus(),
                fragments,
                themes
        );
    }
}
