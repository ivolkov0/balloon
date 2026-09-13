package com.crash.Raketka.service;

import com.crash.Raketka.config.ConfigService;
import com.crash.Raketka.config.GameConfig;
import com.crash.Raketka.domain.Reward;
import com.crash.Raketka.domain.Round;
import com.crash.Raketka.domain.RoundStatus;
import com.crash.Raketka.domain.Theme;
import com.crash.Raketka.domain.User;
import com.crash.Raketka.dto.RoundStateResponse;
import com.crash.Raketka.dto.StartRoundRequest;
import com.crash.Raketka.dto.StartRoundResponse;
import com.crash.Raketka.exception.NotEnoughBalanceException;
import com.crash.Raketka.repository.RoundRepository;
import com.crash.Raketka.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Стейт-машина раунда — см. README бэкенда, разделы 6-8, для полной модели.
 * Ключевое отличие от предыдущей версии: cashout НЕ завершает раунд —
 * переводит в CASHED_OUT, шар продолжает лететь (raw-рост не останавливается),
 * очки и награда начисляются только в момент фактического CRASHED (планировщик
 * либо этот же cashout, если крах уже произошёл раньше нажатия).
 */
@Service
public class RoundService {

    private static final Logger log = LoggerFactory.getLogger(RoundService.class);

    private final RoundRepository roundRepository;
    private final UserRepository userRepository;
    private final ConfigService configService;
    private final CrashMathService crashMathService;
    private final JsonMapper jsonMapper;

    // Self-инъекция через @Lazy: checkOneRound/cashoutAttempt требуют транзакций,
    // которые Spring не применит при вызове через this.method().
    private final RoundService self;

    public RoundService(RoundRepository roundRepository,
                        UserRepository userRepository,
                        ConfigService configService,
                        CrashMathService crashMathService,
                        JsonMapper jsonMapper,
                        @Lazy RoundService self) {
        this.roundRepository = roundRepository;
        this.userRepository = userRepository;
        this.configService = configService;
        this.crashMathService = crashMathService;
        this.jsonMapper = jsonMapper;
        this.self = self;
    }

    @Transactional
    public StartRoundResponse startRound(Long userId, StartRoundRequest req) {
        if (req.theme() == null) {
            throw new IllegalArgumentException("theme must not be null");
        }

        GameConfig config = configService.get();
        GameConfig.FragmentConfig fragment = fragmentFor(req.fragmentId(), config);
        GameConfig.ThemeConfig themeConfig = themeConfigFor(req.theme(), config);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found: " + userId));
        if (fragment.getBetAmount() > user.getBalance()) {
            throw new NotEnoughBalanceException("betAmount exceeds current balance");
        }

        user.setBalance(user.getBalance() - fragment.getBetAmount());
        userRepository.save(user);

        String serverSeed = generateServerSeed(config);
        String seedHash = sha256Hex(serverSeed);

        double crashMultiplier = crashMathService.computeCrashFromSeed(serverSeed, config, req.theme());
        // boosterValue == 1 (фрагмент без усиления) — бустера на линии нет вообще,
        // boosterLine = -1 (см. README п.6.3/6.5): нет смысла и небезопасно
        // тратить случайный забор на позицию, которая никогда не будет видна.
        int boosterLine = fragment.getBoosterValue() > 1
                ? crashMathService.pickBoosterLineFromSeed(serverSeed, req.theme(), config)
                : -1;

        String configSnapshotJson;
        try {
            configSnapshotJson = jsonMapper.writeValueAsString(config);
        } catch (Exception e) {
            throw new IllegalStateException("unable to serialize config snapshot", e);
        }

        Round round = new Round(
                req.theme(),
                userId,
                user.getUsername(),
                req.fragmentId(),
                fragment.getBetAmount(),
                fragment.getBoosterValue(),
                crashMultiplier,
                boosterLine,
                false,
                RoundStatus.IN_PROGRESS,
                0,
                Instant.now(),
                serverSeed,
                seedHash,
                configSnapshotJson
        );

        round = roundRepository.save(round);

        log.info("round {} started: user={}, theme={}, fragment={}, bet={}, booster={}",
                round.getId(), userId, req.theme(), req.fragmentId(), fragment.getBetAmount(), fragment.getBoosterValue());

        return new StartRoundResponse(
                round.getId(),
                seedHash,
                round.getStartedAt(),
                req.theme(),
                themeConfig.getLevelsTotal(),
                fragment.getBetAmount(),
                fragment.getBoosterValue(),
                themeConfig.getLevelThresholds()
        );
    }

    @Transactional(readOnly = true)
    public RoundStateResponse getState(Long userId, Long roundId) {
        Round round = roundRepository.findByIdAndUserId(roundId, userId)
                .orElseThrow(() -> new NoSuchElementException("round not found"));
        GameConfig snapshotConfig = snapshotOf(round);

        if (round.getStatus() == RoundStatus.IN_PROGRESS || round.getStatus() == RoundStatus.CASHED_OUT) {
            double rawCurrent = crashMathService.computeCurrentMultiplier(
                    snapshotConfig.getMultiplierGrowthRate(), round.getStartedAt(), Instant.now());

            // Окно краха: шар уже долетел до crashMultiplier, но планировщик
            // (тик раз в 200мс) ещё не успел записать это в БД. Не пишем сюда —
            // просто отдаём клиенту финальный вид уже сейчас (см. README п.8.2,
            // "защита от окна краха"), планировщик догонит запись сам.
            if (rawCurrent >= round.getCrashMultiplier()) {
                return previewCrashResponse(round, snapshotConfig);
            }

            double displayCurrent = previewWithBooster(round, snapshotConfig, rawCurrent);
            boolean canCashout = round.getStatus() == RoundStatus.IN_PROGRESS
                    && rawCurrent >= firstLevelThreshold(round, snapshotConfig);
            return toResponse(round, rawCurrent, displayCurrent, canCashout, snapshotConfig);
        }

        // CRASHED — терминально, всё уже посчитано и лежит в БД.
        return toResponse(round, round.getCrashMultiplier(), finalCrashDisplayValue(round), false, snapshotConfig);
    }

    public RoundStateResponse cashout(Long userId, Long roundId) {
        try {
            return self.cashoutAttempt(userId, roundId);
        } catch (OptimisticLockingFailureException e) {
            log.warn("round {}: optimistic lock conflict during cashout, retrying once", roundId);
            return self.cashoutAttempt(userId, roundId);
        }
    }

    @Transactional
    public RoundStateResponse cashoutAttempt(Long userId, Long roundId) {
        Round round = roundRepository.findByIdAndUserId(roundId, userId)
                .orElseThrow(() -> new NoSuchElementException("round not found"));

        if (round.getStatus() != RoundStatus.IN_PROGRESS) {
            // Уже забрал раньше либо раунд уже лопнул — идемпотентный ответ
            // текущим состоянием, без побочных эффектов.
            log.info("round {} cashout called but round already in status={}", round.getId(), round.getStatus());
            return self.getState(userId, roundId);
        }

        GameConfig snapshotConfig = snapshotOf(round);
        double rawCurrent = crashMathService.computeCurrentMultiplier(
                snapshotConfig.getMultiplierGrowthRate(), round.getStartedAt(), Instant.now());

        if (rawCurrent >= round.getCrashMultiplier()) {
            // Не успел — шар лопнул раньше, чем долетел этот запрос. Крах
            // финализируем прямо здесь и сейчас (без отдельной REQUIRES_NEW
            // транзакции и без исключений — см. README п.14.7), чтобы клиент
            // сразу получил окончательный ответ, не дожидаясь следующего тика
            // планировщика.
            finalizeCrash(round, snapshotConfig);
            log.info("round {} crashed before cashout could be processed", round.getId());
            return toResponse(round, round.getCrashMultiplier(), finalCrashDisplayValue(round), false, snapshotConfig);
        }

        double firstThreshold = firstLevelThreshold(round, snapshotConfig);
        if (rawCurrent < firstThreshold) {
            throw new IllegalArgumentException("cannot cashout before first level");
        }

        boolean boosterTriggered = applyBoosterFlag(round, snapshotConfig, rawCurrent);
        double current = boosterTriggered ? rawCurrent * round.getBoosterValue() : rawCurrent;

        round.setStatus(RoundStatus.CASHED_OUT);
        round.setCashoutMultiplier(current);
        // finishedAt НЕ ставим — шар продолжает лететь до реального crash
        // (см. README п.6.6/8.1: "Даже после cashout шар продолжает лететь").

        Long ownerId = round.getUserId();
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new NoSuchElementException("user not found: " + ownerId));
        int payout = (int) Math.round(round.getBetAmount() * current);
        user.setBalance(user.getBalance() + payout);
        userRepository.save(user);

        round = roundRepository.save(round);

        log.info("round {} cashed out at {}x, payout={} (points/reward — при crash)", round.getId(), current, payout);

        return toResponse(round, rawCurrent, current, false, snapshotConfig);
    }

    @Scheduled(fixedDelay = 200)
    public void checkActiveRounds() {
        List<Round> active = roundRepository.findByStatusIn(List.of(RoundStatus.IN_PROGRESS, RoundStatus.CASHED_OUT));
        for (Round r : active) {
            try {
                self.checkOneRound(r.getId());
            } catch (OptimisticLockingFailureException e) {
                log.warn("round {}: skipped this tick due to concurrent modification", r.getId());
            } catch (RuntimeException e) {
                log.error("round {}: unexpected error during scheduled check", r.getId(), e);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void checkOneRound(Long roundId) {
        Round round = roundRepository.findById(roundId).orElse(null);
        if (round == null || (round.getStatus() != RoundStatus.IN_PROGRESS && round.getStatus() != RoundStatus.CASHED_OUT)) {
            return;
        }

        GameConfig snapshotConfig = snapshotOf(round);
        double rawCurrent = crashMathService.computeCurrentMultiplier(
                snapshotConfig.getMultiplierGrowthRate(), round.getStartedAt(), Instant.now());

        if (rawCurrent >= round.getCrashMultiplier()) {
            finalizeCrash(round, snapshotConfig);
            return;
        }

        // Бустер после cashout больше не может сработать впервые (см. README
        // п.6.5) — флаг замораживаем в момент cashout, дальше только считаем
        // рост показанного множителя (см. previewWithBooster в toResponse-путях).
        if (round.getStatus() == RoundStatus.IN_PROGRESS) {
            boolean justTriggered = applyBoosterFlag(round, snapshotConfig, rawCurrent);
            if (justTriggered) {
                roundRepository.save(round);
            }
        }
    }

    /**
     * Единая точка финализации краха — вызывается и планировщиком, и cashout,
     * если игрок не успел (см. README п.14.7: без исключений, без rollback).
     * Очки и награда начисляются здесь и только здесь, один раз (п.6.8).
     */
    private void finalizeCrash(Round round, GameConfig config) {
        round.setStatus(RoundStatus.CRASHED);
        round.setFinishedAt(Instant.now());

        int levelsPassed = crashMathService.computeLevelsPassed(round.getCrashMultiplier(), config, round.getTheme());
        boolean cashoutMade = round.getCashoutMultiplier() != null;
        int points = crashMathService.computePointsEarned(levelsPassed, cashoutMade, round.isBoosterTriggered(), config);

        // Награда — по итогам РАУНДА (п.1.5 ТЗ), независимо от исхода: и при
        // выигрыше (cashout), и при проигрыше. Не декоративная — это третья,
        // отдельная от баланса и очков, прогресс-сущность (см. Критерии оценки,
        // "Сквозная логика игры и мотивация"). Копится навсегда в User.puzzleX,
        // а не только показывается один раз на экране результата.
        Reward reward = crashMathService.pickReward(config, new SecureRandom());
        round.setReward(reward);

        User user = userRepository.findById(round.getUserId())
                .orElseThrow(() -> new NoSuchElementException("user not found: " + round.getUserId()));

        int setsBefore = user.getSetsCompleted();
        user.incrementPuzzleCount(reward);
        boolean setCompleted = user.getSetsCompleted() > setsBefore;
        round.setSetCompleted(setCompleted);
        if (setCompleted) {
            points += config.getPointsSetCompleteBonus();
        }
        round.setPointsEarned(points);

        user.setPoints(user.getPoints() + points);
        userRepository.save(user);

        roundRepository.save(round);

        log.info("round {} crashed at {}x, cashoutMade={}, levelsPassed={}, points={}, reward={}, setCompleted={}",
                round.getId(), round.getCrashMultiplier(), cashoutMade, levelsPassed, points, reward, setCompleted);
    }

    /** Если raw пересёк порог линии бустера и бустер ещё не сработал — фиксирует флаг. Возвращает итоговое значение флага. */
    private boolean applyBoosterFlag(Round round, GameConfig config, double rawCurrent) {
        if (round.isBoosterTriggered()) {
            return true;
        }
        if (round.getBoosterLine() < 0) {
            return false;
        }
        double lineThreshold = boosterLineThreshold(round, config);
        if (rawCurrent >= lineThreshold) {
            round.setBoosterTriggered(true);
            return true;
        }
        return false;
    }

    /** То же самое, но без побочных эффектов — для read-only предпросмотра в getState. */
    private double previewWithBooster(Round round, GameConfig config, double rawCurrent) {
        if (round.isBoosterTriggered()) {
            return rawCurrent * round.getBoosterValue();
        }
        if (round.getBoosterLine() < 0) {
            return rawCurrent;
        }
        double lineThreshold = boosterLineThreshold(round, config);
        if (rawCurrent >= lineThreshold) {
            return rawCurrent * round.getBoosterValue();
        }
        return rawCurrent;
    }

    /**
     * Crash — событие в RAW-пространстве (rawCurrent >= crashMultiplier,
     * см. README п.6.2/6.7), но игрок все время полёта видит currentMultiplier
     * УЖЕ с бустером (если он сработал). Если отдать клиенту чистый
     * round.getCrashMultiplier() как финальное значение — коэффициент на
     * экране визуально "прыгнет назад" (например, был 7.78, стал 4.09), хотя
     * на самом деле это тот же самый момент, просто в другом пространстве.
     * Поэтому для ВСЕГО, что показываем игроку как "во сколько раз долетел
     * шар" (currentMultiplier/crashMultiplier-поле/missedMultiplier), красим
     * тем же бустером, что и весь остальной полёт. Для levelsPassed при этом
     * везде используется чистый raw round.getCrashMultiplier() — пороги
     * уровней от бустера не зависят (п.6.4). Сам пересчёт живёт в
     * Round.getDisplayCrashMultiplier() — единая точка правды, используется
     * и здесь, и в HistoryController (раньше были 2 копии, разошлись).
     */
    private double finalCrashDisplayValue(Round round) {
        return round.getDisplayCrashMultiplier();
    }

    private double boosterLineThreshold(Round round, GameConfig config) {
        GameConfig.ThemeConfig themeConfig = themeConfigFor(round.getTheme(), config);
        return themeConfig.getLevelThresholds().get(round.getBoosterLine());
    }

    private double firstLevelThreshold(Round round, GameConfig config) {
        GameConfig.ThemeConfig themeConfig = themeConfigFor(round.getTheme(), config);
        return themeConfig.getLevelThresholds().get(0);
    }

    private RoundStateResponse previewCrashResponse(Round round, GameConfig config) {
        int levelsPassed = crashMathService.computeLevelsPassed(round.getCrashMultiplier(), config, round.getTheme());
        boolean cashoutMade = round.getCashoutMultiplier() != null;
        // Виртуальные (не сохранённые) очки — то же самое, что посчитает
        // finalizeCrash через мгновение; показываем заранее, чтобы фронт не
        // видел растущий кэф у уже мёртвого шара (см. README п.8.2).
        int previewPoints = crashMathService.computePointsEarned(levelsPassed, cashoutMade, round.isBoosterTriggered(), config);
        double displayCrash = finalCrashDisplayValue(round);
        Double missedMultiplier = cashoutMade ? displayCrash : null;

        return new RoundStateResponse(
                RoundStatus.CRASHED.toString(),
                displayCrash,
                levelsPassed,
                round.isBoosterTriggered(),
                round.getCashoutMultiplier(),
                displayCrash,
                previewPoints,
                round.getReward() != null ? round.getReward().toString() : null,
                missedMultiplier,
                round.getServerSeed(),
                false,
                // setCompleted ставится в finalizeCrash — эта preview-ветка
                // не пишет в БД (см. её комментарий выше), поэтому в момент
                // самого предпросмотра флаг ещё не мог быть посчитан, только
                // на следующем опросе после того, как планировщик закоммитит.
                false
        );
    }

    private RoundStateResponse toResponse(Round round, double rawForLevels, double displayCurrent,
                                          boolean canCashout, GameConfig config) {
        int levelsPassed = crashMathService.computeLevelsPassed(rawForLevels, config, round.getTheme());

        Double missedMultiplier = null;
        if (round.getStatus() == RoundStatus.CRASHED && round.getCashoutMultiplier() != null) {
            missedMultiplier = finalCrashDisplayValue(round);
        }

        String reward = round.getReward() != null ? round.getReward().toString() : null;
        // Раскрываем seed, как только раунд определённо не IN_PROGRESS —
        // и CASHED_OUT, и CRASHED (см. README п.8.2, таблица полей state):
        // после cashout игроку уже нечем "подглядывать" себе в плюс.
        String serverSeed = round.getStatus() != RoundStatus.IN_PROGRESS ? round.getServerSeed() : null;

        return new RoundStateResponse(
                round.getStatus().toString(),
                displayCurrent,
                levelsPassed,
                round.isBoosterTriggered(),
                round.getCashoutMultiplier(),
                round.getStatus() == RoundStatus.CRASHED ? finalCrashDisplayValue(round) : null,
                round.getPointsEarned(),
                reward,
                missedMultiplier,
                serverSeed,
                canCashout,
                round.getStatus() == RoundStatus.CRASHED && round.isSetCompleted()
        );
    }

    private GameConfig snapshotOf(Round round) {
        try {
            return jsonMapper.readValue(round.getConfigSnapshotJson(), GameConfig.class);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "unable to deserialize config snapshot for round " + round.getId(), e);
        }
    }

    private String generateServerSeed(GameConfig config) {
        if (config.getFixedSeed() != null) {
            return String.format("%016x", config.getFixedSeed());
        }
        byte[] seedBytes = new byte[32];
        new SecureRandom().nextBytes(seedBytes);
        return HexFormat.of().formatHex(seedBytes);
    }

    private GameConfig.ThemeConfig themeConfigFor(Theme theme, GameConfig config) {
        GameConfig.ThemeConfig themeConfig = config.getThemes().get(theme.name());
        if (themeConfig == null) {
            throw new IllegalArgumentException("No config found for theme " + theme.name());
        }
        return themeConfig;
    }

    private GameConfig.FragmentConfig fragmentFor(int fragmentId, GameConfig config) {
        return config.getFragments().stream()
                .filter(f -> f.getId() == fragmentId)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("unknown fragmentId: " + fragmentId));
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
