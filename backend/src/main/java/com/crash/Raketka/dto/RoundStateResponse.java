package com.crash.Raketka.dto;

public record RoundStateResponse(
        String status,
        double currentMultiplier,
        int levelsPassed,
        boolean boosterTriggered,
        Double cashoutMultiplier,
        Double crashMultiplier,
        Integer pointsEarned,
        String reward,
        Double missedMultiplier,
        String serverSeed,
        // true только если IN_PROGRESS и пройден 1-й уровень (см. RoundService.canCashout) —
        // фронт включает кнопку «Забрать» строго по этому полю, не считает пороги сам.
        boolean canCashout,
        // true, только если ИМЕННО этот раунд принёс полный комплект пазла
        // (см. User.getSetsCompleted()) — только в момент CRASHED, всегда
        // false до этого. pointsEarned уже включает pointsSetCompleteBonus.
        boolean setCompleted
) {
}
