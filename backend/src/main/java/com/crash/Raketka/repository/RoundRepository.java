package com.crash.Raketka.repository;

import com.crash.Raketka.domain.Round;
import com.crash.Raketka.domain.RoundStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {

    // Планировщик крутит и IN_PROGRESS (ещё не забрал), и CASHED_OUT (забрал,
    // но шар долетает до краха, см. README бэкенда п.6.6/8.1) — оба статуса
    // нетерминальны, оба должны быть проверены на "долетел до crashMultiplier?".
    List<Round> findByStatusIn(Collection<RoundStatus> statuses);

    List<Round> findByUserIdAndFinishedAtIsNotNullOrderByFinishedAtDesc(Long userId, Pageable pageable);

    // Глобальная история (п.1.2 ТЗ: "с учётом результатов всех пользователей
    // прототипа") — без фильтра по userId.
    List<Round> findByFinishedAtIsNotNullOrderByFinishedAtDesc(Pageable pageable);

    Optional<Round> findByIdAndUserId(Long id, Long userId);
}
