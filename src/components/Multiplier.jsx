import { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValueEvent } from 'framer-motion';

// Стадии подсветки коэффициента по уровню (п. 1.3 ТЗ): 0-1 обычный текст,
// 1-2 жёлтый, 2-3 жёлтый+подсветка, 3+ жёлтый+подсветка+крупный шрифт.
function stageForLevel(level) {
  if (level >= 3) return 3;
  if (level >= 2) return 2;
  if (level >= 1) return 1;
  return 0;
}

/**
 * Число обновляется каждый кадр напрямую через textContent из MotionValue —
 * без ре-рендера React на 60 fps. Узел при смене стадии не перемонтируется
 * (меняется только класс) — иначе ref на span оборвётся и число зависнет.
 */
export default function Multiplier({ value, level }) {
  const stage = stageForLevel(level);
  const textRef = useRef(null);
  const controls = useAnimation();

  useMotionValueEvent(value, 'change', (v) => {
    if (textRef.current) textRef.current.textContent = `×${v.toFixed(2)}`;
  });

  // первичная отрисовка до первого change-события
  useEffect(() => {
    if (textRef.current) textRef.current.textContent = `×${value.get().toFixed(2)}`;
  }, [value]);

  // короткий "поп" при переходе на новую стадию подсветки
  useEffect(() => {
    controls.start({
      scale: [1.22, 1],
      transition: { type: 'spring', stiffness: 320, damping: 16 },
    });
  }, [stage, controls]);

  return (
    <motion.div className={`multiplier-value multiplier-stage-${stage}`} animate={controls}>
      <span ref={textRef} />
    </motion.div>
  );
}
