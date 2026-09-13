import { getPublicConfig, toFrontendTheme } from './client.js';

export const POLL_INTERVAL_MS = 300; // README бэкенда п.13: поллинг раунда 200-500мс

// Дефолт для баланса на экране ДО того, как разрешится ensureSession() —
// реальное значение придёт с сервера почти сразу, это просто чтобы
// balance.toLocaleString() не падал на undefined в первый тик рендера.
export const STARTING_BALANCE_FALLBACK = 100_000;

/**
 * GET /api/config/public не отдаёт внутреннюю математику (houseEdge,
 * multiplierGrowthRate, maxMultiplier — см. README бэкенда п.5), только то,
 * что нужно для экранов ДО старта раунда: фрагменты ставок и пороги уровней
 * по темам. Приводим к форме, удобной компонентам (lowercase-тема как везде
 * в UI, фрагменты — как раньше были BET_OPTIONS).
 */
export async function loadGameConfig() {
  const raw = await getPublicConfig();

  const themes = {};
  Object.entries(raw.themes).forEach(([name, theme]) => {
    themes[toFrontendTheme(name)] = {
      levelsTotal: theme.levelsTotal,
      levelThresholds: theme.levelThresholds,
    };
  });

  return {
    startingBalance: raw.startingBalance,
    pointsPerLine: raw.pointsPerLine,
    pointsCashoutBonus: raw.pointsCashoutBonus,
    pointsBoosterBonus: raw.pointsBoosterBonus,
    pointsSetCompleteBonus: raw.pointsSetCompleteBonus,
    betOptions: raw.fragments.map((f) => ({
      fragmentId: f.id,
      betAmount: f.betAmount,
      boosterValue: f.boosterValue,
    })),
    themes,
  };
}
