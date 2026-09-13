package com.crash.Raketka.config;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Полный (приватный, серверный) конфиг игры — читается из config.json.
 * Публичная проекция для клиента — см. {@link com.crash.Raketka.dto.PublicConfigResponse}
 * и {@link com.crash.Raketka.controller.ConfigController}: houseEdge,
 * minCrashMultiplier, maxMultiplier, multiplierGrowthRate, lineProbabilities,
 * fixedSeed клиенту НЕ отдаются — это внутренняя математика (см. README.md
 * бэкенда, п.5).
 */
public class GameConfig {

    @JsonProperty("gameId")
    private String gameId;

    @JsonProperty("gameName")
    private String gameName;

    @JsonProperty("gameType")
    private String gameType;

    @JsonProperty("isActive")
    private boolean isActive;

    @JsonProperty("minCrashMultiplier")
    private double minCrashMultiplier;

    @JsonProperty("maxMultiplier")
    private double maxMultiplier;

    @JsonProperty("multiplierGrowthRate")
    private double multiplierGrowthRate;

    @JsonProperty("houseEdge")
    private double houseEdge;

    @JsonProperty("pointsPerLine")
    private int pointsPerLine;

    @JsonProperty("pointsCashoutBonus")
    private int pointsCashoutBonus;

    @JsonProperty("pointsBoosterBonus")
    private int pointsBoosterBonus;

    // Бонус очков за собранный полный комплект пазла (4 разных фрагмента,
    // см. User.getSetsCompleted()) — настраиваемый параметр начислений,
    // как pointsPerLine/pointsCashoutBonus/pointsBoosterBonus (см. ТЗ п.1.9:
    // "points_xN_bonus").
    @JsonProperty("pointsSetCompleteBonus")
    private int pointsSetCompleteBonus;

    @JsonProperty("startingBalance")
    private int startingBalance;

    @JsonProperty("fixedSeed")
    private Long fixedSeed;

    @JsonProperty("fragments")
    private List<FragmentConfig> fragments;

    @JsonProperty("themes")
    private Map<String, ThemeConfig> themes;

    @JsonProperty("rewardWeights")
    private Map<String, Double> rewardWeights;

    public GameConfig() {
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public String getGameName() {
        return gameName;
    }

    public void setGameName(String gameName) {
        this.gameName = gameName;
    }

    public String getGameType() {
        return gameType;
    }

    public void setGameType(String gameType) {
        this.gameType = gameType;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        this.isActive = active;
    }

    public double getMinCrashMultiplier() {
        return minCrashMultiplier;
    }

    public void setMinCrashMultiplier(double minCrashMultiplier) {
        this.minCrashMultiplier = minCrashMultiplier;
    }

    public double getMaxMultiplier() {
        return maxMultiplier;
    }

    public void setMaxMultiplier(double maxMultiplier) {
        this.maxMultiplier = maxMultiplier;
    }

    public double getMultiplierGrowthRate() {
        return multiplierGrowthRate;
    }

    public void setMultiplierGrowthRate(double multiplierGrowthRate) {
        this.multiplierGrowthRate = multiplierGrowthRate;
    }

    public double getHouseEdge() {
        return houseEdge;
    }

    public void setHouseEdge(double houseEdge) {
        this.houseEdge = houseEdge;
    }

    public int getPointsPerLine() {
        return pointsPerLine;
    }

    public void setPointsPerLine(int pointsPerLine) {
        this.pointsPerLine = pointsPerLine;
    }

    public int getPointsCashoutBonus() {
        return pointsCashoutBonus;
    }

    public void setPointsCashoutBonus(int pointsCashoutBonus) {
        this.pointsCashoutBonus = pointsCashoutBonus;
    }

    public int getPointsBoosterBonus() {
        return pointsBoosterBonus;
    }

    public void setPointsBoosterBonus(int pointsBoosterBonus) {
        this.pointsBoosterBonus = pointsBoosterBonus;
    }

    public int getPointsSetCompleteBonus() {
        return pointsSetCompleteBonus;
    }

    public void setPointsSetCompleteBonus(int pointsSetCompleteBonus) {
        this.pointsSetCompleteBonus = pointsSetCompleteBonus;
    }

    public int getStartingBalance() {
        return startingBalance;
    }

    public void setStartingBalance(int startingBalance) {
        this.startingBalance = startingBalance;
    }

    public Long getFixedSeed() {
        return fixedSeed;
    }

    public void setFixedSeed(Long fixedSeed) {
        this.fixedSeed = fixedSeed;
    }

    public List<FragmentConfig> getFragments() {
        return fragments;
    }

    public void setFragments(List<FragmentConfig> fragments) {
        this.fragments = fragments;
    }

    public Map<String, ThemeConfig> getThemes() {
        return themes;
    }

    public void setThemes(Map<String, ThemeConfig> themes) {
        this.themes = themes;
    }

    public Map<String, Double> getRewardWeights() {
        return rewardWeights;
    }

    public void setRewardWeights(Map<String, Double> rewardWeights) {
        this.rewardWeights = rewardWeights;
    }

    /** Фрагмент пазла ставки: пара (сумма ставки, значение бустера), п.1.2 ТЗ. */
    public static class FragmentConfig {

        @JsonProperty("id")
        private int id;

        @JsonProperty("betAmount")
        private int betAmount;

        @JsonProperty("boosterValue")
        private int boosterValue;

        public FragmentConfig() {
        }

        public int getId() {
            return id;
        }

        public void setId(int id) {
            this.id = id;
        }

        public int getBetAmount() {
            return betAmount;
        }

        public void setBetAmount(int betAmount) {
            this.betAmount = betAmount;
        }

        public int getBoosterValue() {
            return boosterValue;
        }

        public void setBoosterValue(int boosterValue) {
            this.boosterValue = boosterValue;
        }
    }

    public static class ThemeConfig {

        @JsonProperty("levelsTotal")
        private int levelsTotal;

        /** Вероятности того, что бустер "ждёт" именно на линии i (0..levelsTotal-1). */
        @JsonProperty("lineProbabilities")
        private List<Double> lineProbabilities;

        /** Пороги множителя (raw, без бустера) для прохождения уровня i. Строго возрастают. */
        @JsonProperty("levelThresholds")
        private List<Double> levelThresholds;

        public ThemeConfig() {
        }

        public int getLevelsTotal() {
            return levelsTotal;
        }

        public void setLevelsTotal(int levelsTotal) {
            this.levelsTotal = levelsTotal;
        }

        public List<Double> getLineProbabilities() {
            return lineProbabilities;
        }

        public void setLineProbabilities(List<Double> lineProbabilities) {
            this.lineProbabilities = lineProbabilities;
        }

        public List<Double> getLevelThresholds() {
            return levelThresholds;
        }

        public void setLevelThresholds(List<Double> levelThresholds) {
            this.levelThresholds = levelThresholds;
        }
    }
}
