package com.crash.Raketka.service;

import com.crash.Raketka.config.GameConfig;
import com.crash.Raketka.domain.Reward;
import com.crash.Raketka.domain.Theme;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class CrashMathService {

    // Явно фиксируем алгоритм: платформенный дефолт SecureRandom (например,
    // NativePRNG на Linux) не гарантирует детерминированность по seed —
    // может подмешивать энтропию ОС. SHA1PRNG детерминирован при setSeed
    // до первого вызова nextDouble()/nextBytes().
    private static final String DETERMINISTIC_RNG_ALGORITHM = "SHA1PRNG";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    public double computeCrashMultiplier(GameConfig config, SecureRandom rng) {
        double r = rng.nextDouble();
        double crash = (1.0 - config.getHouseEdge()) / (1.0 - r);
        return Math.min(Math.max(crash, config.getMinCrashMultiplier()), config.getMaxMultiplier());
    }

    public double computeCurrentMultiplier(double growthRate, Instant startedAt, Instant now) {
        double t = Duration.between(startedAt, now).toMillis() / 1000.0;
        return Math.exp(growthRate * t);
    }

    /**
     * Взвешенный случайный выбор позиции бустера по lineProbabilities темы
     * (длина массива == levelsTotal, п.1.4 ТЗ: line_1_loot_prob..line_N_loot_prob).
     */
    public int pickBoosterLine(Theme theme, GameConfig config, SecureRandom rng) {
        GameConfig.ThemeConfig themeConfig = requireThemeConfig(theme, config);
        List<Double> lineProbabilities = themeConfig.getLineProbabilities();

        double total = 0.0;
        for (Double p : lineProbabilities) {
            total += p;
        }

        double r = rng.nextDouble() * total;
        double cumulative = 0.0;
        for (int i = 0; i < lineProbabilities.size(); i++) {
            cumulative += lineProbabilities.get(i);
            if (r < cumulative) {
                return i;
            }
        }
        return lineProbabilities.size() - 1;
    }

    /**
     * Детерминированный вывод crash из serverSeed раунда. Параметр theme
     * намеренно не используется (крах математически от темы не зависит) —
     * оставлен ради сигнатуры из ТЗ.
     */
    public double computeCrashFromSeed(String serverSeed, GameConfig config, Theme theme) {
        SecureRandom rng = deterministicRngFor(serverSeed, "crash");
        return computeCrashMultiplier(config, rng);
    }

    /**
     * Детерминированный вывод boosterLine из serverSeed раунда. Использует
     * доменное разделение ("booster-line" вместо "crash" в HMAC), чтобы не
     * повторять тот же самый первый random-забор, что и computeCrashFromSeed —
     * иначе crash и boosterLine оказались бы скоррелированы через один и тот
     * же исходный случайный бит.
     */
    public int pickBoosterLineFromSeed(String serverSeed, Theme theme, GameConfig config) {
        SecureRandom rng = deterministicRngFor(serverSeed, "booster-line");
        return pickBoosterLine(theme, config, rng);
    }

    /**
     * Сколько уровней пройдено при данном RAW (без бустера) множителе —
     * levelThresholds строго возрастают и от бустера не зависят (см. README
     * бэкенда п.6.4: "Пороги не зависят от бустера").
     */
    public int computeLevelsPassed(double rawMultiplier, GameConfig config, Theme theme) {
        GameConfig.ThemeConfig themeConfig = requireThemeConfig(theme, config);
        List<Double> levelThresholds = themeConfig.getLevelThresholds();

        if (levelThresholds == null || levelThresholds.isEmpty()) {
            return 0;
        }

        int levelsTotal = Math.min(themeConfig.getLevelsTotal(), levelThresholds.size());
        int passed = 0;
        for (int i = 0; i < levelsTotal; i++) {
            if (rawMultiplier >= levelThresholds.get(i)) {
                passed++;
            }
        }
        return passed;
    }

    /**
     * Очки начисляются один раз, в момент CRASHED (см. README п.6.8/14.8) —
     * поэтому здесь просто "случился ли cashout" (булево), а не сам
     * зафиксированный множитель.
     */
    public int computePointsEarned(int levelsPassed, boolean cashoutMade, boolean boosterTriggered,
                                   GameConfig config) {
        int points = config.getPointsPerLine() * levelsPassed;
        if (cashoutMade) {
            points += config.getPointsCashoutBonus();
        }
        if (boosterTriggered) {
            points += config.getPointsBoosterBonus();
        }
        return points;
    }

    public Reward pickReward(GameConfig config, SecureRandom rng) {
        Map<String, Double> rewardWeights = config.getRewardWeights();

        double total = 0.0;
        for (Double weight : rewardWeights.values()) {
            total += weight;
        }

        double r = rng.nextDouble() * total;
        double cumulative = 0.0;
        for (Map.Entry<String, Double> entry : rewardWeights.entrySet()) {
            cumulative += entry.getValue();
            if (r < cumulative) {
                return Reward.valueOf(entry.getKey());
            }
        }

        String lastKey = null;
        for (String key : rewardWeights.keySet()) {
            lastKey = key;
        }
        return Reward.valueOf(lastKey);
    }

    private SecureRandom deterministicRngFor(String serverSeed, String purpose) {
        byte[] seedBytes = HexFormat.of().parseHex(serverSeed);
        byte[] derived = hmacSha256(seedBytes, purpose);
        try {
            SecureRandom rng = SecureRandom.getInstance(DETERMINISTIC_RNG_ALGORITHM);
            rng.setSeed(derived);
            return rng;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(DETERMINISTIC_RNG_ALGORITHM + " not available", e);
        }
    }

    private byte[] hmacSha256(byte[] keyBytes, String message) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGORITHM));
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException(HMAC_ALGORITHM + " not available", e);
        }
    }

    private GameConfig.ThemeConfig requireThemeConfig(Theme theme, GameConfig config) {
        GameConfig.ThemeConfig themeConfig = config.getThemes().get(theme.name());
        if (themeConfig == null) {
            throw new IllegalArgumentException("No config found for theme " + theme.name());
        }
        return themeConfig;
    }
}
