import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';

/**
 * Плавная (60 fps) интерполяция полёта на клиенте.
 *
 * Бэкенд намеренно не отдаёт клиенту темп роста коэффициента (growthRate —
 * внутренняя математика, см. README бэкенда п.5) — сервер шлёт только сами
 * точки (currentMultiplier) раз в ~300мс. Чтобы всё равно рисовать гладкую
 * кривую между опросами, оцениваем локальную скорость роста по двум
 * последним серверным точкам (для чистой экспоненты m=exp(rate*t) это точная
 * оценка): rate = ln(m2/m1) / Δt — и экстраполируем вперёd от последней точки
 * той же формулой. Один тик может исказить оценку (например, скачок от
 * бустера) — самокорректируется на следующем опросе, визуально незаметно.
 *
 * Раунд летит и в статусе CASHED_OUT (после «Забрать» шар не останавливается,
 * см. README п.6.6/8.1) — замираем только на CRASHED.
 *
 * Серверные ответы остаются единственным авторитетом для факта краха, очков
 * и выплат — клиент только рисует (п. 2.4 и 7.3 ТЗ).
 *
 * Возвращает MotionValue'ы, а не React-состояние: они пишут в DOM напрямую,
 * без ре-рендера дерева на каждом кадре.
 */
export function useSmoothFlight({
  anchorMultiplier = 1,
  anchorAt,
  anchorRate = 0.15,
  ceiling = 10,
  status,
  finalMultiplier = null,
}) {
  const progress = useMotionValue(0);
  const multiplier = useMotionValue(1);

  useEffect(() => {
    if (!anchorAt) return undefined;

    let raf = 0;

    const apply = (m) => {
      multiplier.set(m);
      // нормализованный прогресс 0..1 для фона/шара: логарифмическая шкала
      // от ×1 до "потолка" (верхний порог уровня * запас на рост после него,
      // см. useGameState.js) — гладко растёт независимо от дискретных
      // уровней (которые рисует LevelTrack по серверному levelsPassed).
      const p = Math.log(Math.max(m, 1)) / Math.log(ceiling);
      progress.set(Math.min(1, Math.max(0, p)));
    };

    if (status === 'CRASHED') {
      // раунд кончился — замираем ровно на серверном значении
      if (finalMultiplier != null) apply(finalMultiplier);
      return undefined;
    }

    const frame = () => {
      const elapsedSeconds = (Date.now() - anchorAt) / 1000;
      apply(anchorMultiplier * Math.exp(anchorRate * elapsedSeconds));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [anchorMultiplier, anchorAt, anchorRate, ceiling, status, finalMultiplier, progress, multiplier]);

  return { progress, multiplier };
}
