package com.crash.Raketka.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.io.File;
import java.util.List;
import java.util.Map;

@Service
public class ConfigService {

    private static final Logger log = LoggerFactory.getLogger(ConfigService.class);

    private static final double PROBABILITY_SUM_MIN = 0.99;
    private static final double PROBABILITY_SUM_MAX = 1.01;
    private static final double HOUSE_EDGE_MAX_EXCLUSIVE = 0.5;

    private final JsonMapper jsonMapper;

    @Value("${CONFIG_PATH:./config.json}")
    private String configPath;

    private volatile GameConfig current;

    public ConfigService(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @PostConstruct
    public void load() {
        GameConfig loaded = readAndValidate();
        this.current = loaded;
        log.info("GameConfig loaded successfully from {}", configPath);
    }

    public GameConfig get() {
        return current;
    }

    public void reload() {
        GameConfig loaded;
        try {
            loaded = readAndValidate();
        } catch (IllegalArgumentException e) {
            log.error("Config reload rejected, keeping previous config: {}", e.getMessage());
            throw e;
        }
        this.current = loaded;
        log.info("GameConfig reloaded successfully from {}", configPath);
    }

    private GameConfig readAndValidate() {
        File file = new File(configPath);
        if (!file.exists() || !file.isFile()) {
            throw new IllegalArgumentException("Config file not found at " + configPath);
        }

        GameConfig config;
        try {
            config = jsonMapper.readValue(file, GameConfig.class);
        } catch (JacksonException e) {
            log.error("Failed to parse config file at {}: {}", configPath, e.getMessage());
            throw new IllegalArgumentException("Unable to parse config file at " + configPath, e);
        }
        validate(config);
        return config;
    }

    private void validate(GameConfig config) {
        if (config.getMinCrashMultiplier() <= 1.0) {
            throw new IllegalArgumentException(
                    "minCrashMultiplier must be > 1.0, got " + config.getMinCrashMultiplier());
        }
        if (config.getMaxMultiplier() <= config.getMinCrashMultiplier()) {
            throw new IllegalArgumentException(
                    "maxMultiplier (" + config.getMaxMultiplier()
                            + ") must be > minCrashMultiplier (" + config.getMinCrashMultiplier() + ")");
        }
        if (config.getMultiplierGrowthRate() <= 0) {
            throw new IllegalArgumentException(
                    "multiplierGrowthRate must be > 0, got " + config.getMultiplierGrowthRate());
        }
        if (config.getHouseEdge() < 0.0 || config.getHouseEdge() >= HOUSE_EDGE_MAX_EXCLUSIVE) {
            throw new IllegalArgumentException(
                    "houseEdge must be in [0, 0.5), got " + config.getHouseEdge());
        }

        Map<String, GameConfig.ThemeConfig> themes = config.getThemes();
        if (themes == null || themes.isEmpty()) {
            throw new IllegalArgumentException("themes must not be empty");
        }
        for (Map.Entry<String, GameConfig.ThemeConfig> entry : themes.entrySet()) {
            String themeName = entry.getKey();
            GameConfig.ThemeConfig themeConfig = entry.getValue();
            if (themeConfig == null) {
                throw new IllegalArgumentException("theme " + themeName + " has null config");
            }
            List<Double> lineProbabilities = themeConfig.getLineProbabilities();
            if (lineProbabilities == null || lineProbabilities.isEmpty()) {
                throw new IllegalArgumentException(
                        "theme " + themeName + " has empty lineProbabilities");
            }
            double sum = 0.0;
            for (Double p : lineProbabilities) {
                if (p == null) {
                    throw new IllegalArgumentException(
                            "theme " + themeName + " has a null entry in lineProbabilities");
                }
                sum += p;
            }
            if (sum < PROBABILITY_SUM_MIN || sum > PROBABILITY_SUM_MAX) {
                throw new IllegalArgumentException(
                        "theme " + themeName + " lineProbabilities sum out of range [0.99, 1.01]: " + sum);
            }
            List<Double> levelThresholds = themeConfig.getLevelThresholds();
            if (levelThresholds == null || levelThresholds.isEmpty()) {
                throw new IllegalArgumentException(
                        "theme " + themeName + " has empty levelThresholds");
            }
            if (levelThresholds.size() != themeConfig.getLevelsTotal()) {
                throw new IllegalArgumentException(
                        "theme " + themeName + " levelThresholds.size() (" + levelThresholds.size()
                                + ") must equal levelsTotal (" + themeConfig.getLevelsTotal() + ")");
            }
            if (lineProbabilities.size() != themeConfig.getLevelsTotal()) {
                throw new IllegalArgumentException(
                        "theme " + themeName + " lineProbabilities.size() (" + lineProbabilities.size()
                                + ") must equal levelsTotal (" + themeConfig.getLevelsTotal() + ")");
            }
            for (int i = 1; i < levelThresholds.size(); i++) {
                if (levelThresholds.get(i) == null || levelThresholds.get(i) <= levelThresholds.get(i - 1)) {
                    throw new IllegalArgumentException(
                            "theme " + themeName + " levelThresholds must strictly increase (index " + i + ")");
                }
            }
        }

        List<GameConfig.FragmentConfig> fragments = config.getFragments();
        if (fragments == null || fragments.isEmpty()) {
            throw new IllegalArgumentException("fragments must not be empty");
        }
        for (GameConfig.FragmentConfig fragment : fragments) {
            if (fragment.getBetAmount() <= 0) {
                throw new IllegalArgumentException("fragment " + fragment.getId() + " betAmount must be positive");
            }
            if (fragment.getBoosterValue() < 1) {
                throw new IllegalArgumentException("fragment " + fragment.getId() + " boosterValue must be >= 1");
            }
        }

        Map<String, Double> rewardWeights = config.getRewardWeights();
        if (rewardWeights == null || rewardWeights.isEmpty()) {
            throw new IllegalArgumentException("rewardWeights must not be empty");
        }
    }
}