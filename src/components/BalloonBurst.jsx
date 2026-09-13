import { useMemo } from 'react';
import { motion } from 'framer-motion';
import SmartImage from './SmartImage.jsx';

const SHARD_PALETTE = {
  green: ['#3fb578', '#155c39', '#c8f7dd', '#0a3d26'],
  red: ['#e5534f', '#8f2323', '#ffc9b8', '#5c1414'],
};

// Асимметричные border-radius — рваный "резиновый" силуэт кусочка вместо
// ровного круга/треугольника.
const SHARD_RADII = ['60% 40% 55% 45% / 45% 55% 40% 60%', '40% 60% 45% 55% / 55% 45% 60% 40%'];

// Расстояния/размеры кусочков считались в пикселях относительно шара
// size=96 — при другом size масштабируем тем же коэффициентом, иначе на
// крупном шаре осколки разлетаются на те же ~50-80px и выглядят игрушечно
// мелкими относительно самого шара.
function makeShards(count, size) {
  const unit = size / 96;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = (46 + Math.random() * 34) * unit;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 240,
      scale: 0.5 + Math.random() * 0.5,
      w: (10 + Math.random() * 10) * unit,
      h: (14 + Math.random() * 14) * unit,
      delay: Math.random() * 0.04,
      radius: SHARD_RADII[i % SHARD_RADII.length],
    };
  });
}

/**
 * Настоящий "взрыв" шара на кусочки резины вместо плоского scale-fade.
 * Монтируется поверх шара ровно в момент CRASHED (см. FlightBalloon.jsx).
 * Кусочки нарисованы кодом: рваные обрывки на асимметричном border-radius,
 * разлетающиеся из центра по случайным траекториям, плюс ударная волна-кольцо
 * в момент хлопка. Если в public/images/ есть готовый арт лопнувшего шара
 * (balloon-{theme}-pop.png, см. public/images/README.md) — он на долю секунды
 * вспыхивает по центру, под разлетающимися кусочками; если файла нет,
 * SmartImage тихо ничего не показывает и взрыв остаётся чисто кодовым.
 */
export default function BalloonBurst({ theme = 'green', size = 96 }) {
  const colors = SHARD_PALETTE[theme] ?? SHARD_PALETTE.green;
  // Траектории считаем один раз при монтировании — компонент живёт ровно
  // один "взрыв" и размонтируется вместе с остальным экраном полёта.
  const shards = useMemo(() => makeShards(10, size), [size]);

  return (
    <div className="balloon-burst" style={{ width: size, height: size }} aria-hidden="true">
      <motion.div
        className="balloon-burst-shock"
        initial={{ scale: 0.2, opacity: 0.7 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <motion.div
        className="balloon-burst-art"
        style={{ width: size * 1.15, height: size * 1.15 }}
        initial={{ scale: 0.85, opacity: 1 }}
        animate={{ scale: 1.25, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <SmartImage src={`/images/balloon-${theme}-pop.png`} alt="" fallback={null} />
      </motion.div>
      {shards.map((s) => (
        <motion.span
          key={s.id}
          className="balloon-burst-shard"
          style={{
            width: s.w,
            height: s.h,
            borderRadius: s.radius,
            background: colors[s.id % colors.length],
          }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 1 }}
          animate={{ x: s.x, y: s.y, rotate: s.rotate, scale: s.scale, opacity: 0 }}
          transition={{ duration: 0.55, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
