package com.crash.Raketka.controller;

import com.crash.Raketka.domain.Round;
import com.crash.Raketka.dto.HistoryItemResponse;
import com.crash.Raketka.repository.RoundRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final RoundRepository roundRepository;

    public HistoryController(RoundRepository roundRepository) {
        this.roundRepository = roundRepository;
    }

    // scope=global (по умолчанию) — все завершённые раунды всех пользователей
    // прототипа, как того требует п.1.2 ТЗ. scope=me — только раунды текущего
    // юзера (полезно для отладки конкретной сессии).
    @GetMapping("")
    public List<HistoryItemResponse> history(Authentication auth,
                                             @RequestParam(defaultValue = "20") int limit,
                                             @RequestParam(defaultValue = "global") String scope) {
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        List<Round> rounds;
        if ("me".equalsIgnoreCase(scope)) {
            Long userId = (Long) auth.getPrincipal();
            rounds = roundRepository.findByUserIdAndFinishedAtIsNotNullOrderByFinishedAtDesc(
                    userId, Pageable.ofSize(limit));
        } else {
            rounds = roundRepository.findByFinishedAtIsNotNullOrderByFinishedAtDesc(Pageable.ofSize(limit));
        }

        return rounds.stream()
                .map(round -> new HistoryItemResponse(
                        round.getUsername(),
                        round.getTheme(),
                        round.getBetAmount(),
                        round.getCashoutMultiplier(),
                        round.getDisplayCrashMultiplier(),
                        round.getCashoutMultiplier() != null ? "WIN" : "LOSS",
                        round.getPointsEarned()
                ))
                .toList();
    }
}
