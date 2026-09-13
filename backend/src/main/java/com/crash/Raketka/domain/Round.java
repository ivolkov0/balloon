package com.crash.Raketka.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

@Entity
@Table(name = "rounds")
public class Round {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Theme theme;

    private int fragmentId;

    private int betAmount;

    private int boosterValue;

    private double crashMultiplier;

    private int boosterLine;

    private boolean boosterTriggered;

    // Ставится в finalizeCrash, только для передачи наружу в ответе на ЭТОТ
    // раунд ("только что собрали полный комплект пазла") — не переиспользуется
    // и не значит ничего для будущих раундов, тупо поле-флаг для DTO.
    private boolean setCompleted;

    private Double cashoutMultiplier;

    @Enumerated(EnumType.STRING)
    private RoundStatus status;

    private int pointsEarned;

    @Enumerated(EnumType.STRING)
    private Reward reward;

    private Instant startedAt;

    private Instant finishedAt;

    private String serverSeed;

    private String seedHash;

    @Column(columnDefinition = "text")
    private String configSnapshotJson;

    @Version
    private Long version;

    @Column(nullable = false)
    private Long userId;

    // Денормализация: имя игрока на момент старта раунда, чтобы отдавать
    // глобальную историю (GET /api/history?scope=global, п.1.2 ТЗ) без джойна
    // с users на каждый запрос. Смена username задним числом на старые
    // раунды не переносится — для прототипа это не требуется.
    @Column(nullable = false)
    private String username;

    protected Round() {
    }

    public Round(Theme theme,
                 Long userId,
                 String username,
                 int fragmentId,
                 int betAmount,
                 int boosterValue,
                 double crashMultiplier,
                 int boosterLine,
                 boolean boosterTriggered,
                 RoundStatus status,
                 int pointsEarned,
                 Instant startedAt,
                 String serverSeed,
                 String seedHash,
                 String configSnapshotJson) {
        this.theme = theme;
        this.userId = userId;
        this.username = username;
        this.fragmentId = fragmentId;
        this.betAmount = betAmount;
        this.boosterValue = boosterValue;
        this.crashMultiplier = crashMultiplier;
        this.boosterLine = boosterLine;
        this.boosterTriggered = boosterTriggered;
        this.status = status;
        this.pointsEarned = pointsEarned;
        this.startedAt = startedAt;
        this.serverSeed = serverSeed;
        this.seedHash = seedHash;
        this.configSnapshotJson = configSnapshotJson;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Theme getTheme() {
        return theme;
    }

    public void setTheme(Theme theme) {
        this.theme = theme;
    }

    public int getFragmentId() {
        return fragmentId;
    }

    public void setFragmentId(int fragmentId) {
        this.fragmentId = fragmentId;
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

    public double getCrashMultiplier() {
        return crashMultiplier;
    }

    public void setCrashMultiplier(double crashMultiplier) {
        this.crashMultiplier = crashMultiplier;
    }

    /**
     * crashMultiplier — точка краха в RAW-пространстве (сравнение
     * rawCurrent >= crashMultiplier не зависит от бустера, см. README бэка
     * п.6.2/6.7). Но игрок всё время полёта видит currentMultiplier уже С
     * бустером (если он сработал) — если отдать вовне чистый raw
     * crashMultiplier как "во сколько раз долетел шар", коэффициент
     * визуально "прыгнет назад" в момент краха. Поэтому везде, где значение
     * идёт ИГРОКУ (state, history), нужно именно это — тот же бустер, что и
     * весь остальной полёт. Единая точка правды: раньше этот пересчёт был
     * продублирован в RoundService и HistoryController и разошёлся.
     */
    public double getDisplayCrashMultiplier() {
        return boosterTriggered ? crashMultiplier * boosterValue : crashMultiplier;
    }

    public int getBoosterLine() {
        return boosterLine;
    }

    public void setBoosterLine(int boosterLine) {
        this.boosterLine = boosterLine;
    }

    public boolean isBoosterTriggered() {
        return boosterTriggered;
    }

    public void setBoosterTriggered(boolean boosterTriggered) {
        this.boosterTriggered = boosterTriggered;
    }

    public boolean isSetCompleted() {
        return setCompleted;
    }

    public void setSetCompleted(boolean setCompleted) {
        this.setCompleted = setCompleted;
    }

    public Double getCashoutMultiplier() {
        return cashoutMultiplier;
    }

    public void setCashoutMultiplier(Double cashoutMultiplier) {
        this.cashoutMultiplier = cashoutMultiplier;
    }

    public RoundStatus getStatus() {
        return status;
    }

    public void setStatus(RoundStatus status) {
        this.status = status;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(int pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public Reward getReward() {
        return reward;
    }

    public void setReward(Reward reward) {
        this.reward = reward;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getServerSeed() {
        return serverSeed;
    }

    public void setServerSeed(String serverSeed) {
        this.serverSeed = serverSeed;
    }

    public String getSeedHash() {
        return seedHash;
    }

    public void setSeedHash(String seedHash) {
        this.seedHash = seedHash;
    }

    public String getConfigSnapshotJson() {
        return configSnapshotJson;
    }

    public void setConfigSnapshotJson(String configSnapshotJson) {
        this.configSnapshotJson = configSnapshotJson;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
