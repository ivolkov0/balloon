import { useEffect, useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import Balloon from './Balloon.jsx';
import BalloonBurst from './BalloonBurst.jsx';
import { playPopSound } from '../lib/sound.js';

const THEME_CONFETTI = {
  green: ['#35a06b', '#f0b400', '#ffffff'],
  red: ['#e24b4a', '#f0b400', '#ffffff'],
};

/**
 * Шар, летящий вверх по игровому экрану. Позиция берётся из MotionValue,
 * который обновляется каждый кадр (см. useSmoothFlight.js) — поэтому движение
 * непрерывное, а не скачками по целым уровням раз в 400мс. CSS-transition тут
 * НЕ нужен: он бы боролся с покадровыми обновлениями и давал резину.
 *
 * При status === 'CRASHED' — звук хлопка, конфетти-разлёт ровно в точке шара
 * (координаты берутся из реального DOM-узла) и сам шар лопается на кусочки
 * резины (BalloonBurst) вместо плоского scale-fade.
 */
// Ширина:высота картинки шара ~1:1.5 (совпадает и с реальным PNG, и со
// SVG-fallback) + небольшой запас, чтобы на максимуме шар не упирался
// вплотную в коэффициент.
const BALLOON_ASPECT = 1.5;
const TOP_MARGIN_PX = 20;

export default function FlightBalloon({ theme, progress, status, size = 76 }) {
  const wrapRef = useRef(null);
  const popped = status === 'CRASHED';

  // Раньше потолок был фиксированным "82% высоты трассы" — подобран под
  // старый маленький размер шара и на большом шаре шар вылезал выше своего
  // контейнера, перекрывая коэффициент. Теперь вычитаем реальную высоту
  // шара (в px, растущую вместе с прогрессом) из процента — тогда при p=1
  // верхний край шара гарантированно остаётся внутри трассы независимо от
  // size и высоты контейнера на конкретном экране.
  const balloonHeightPx = size * BALLOON_ASPECT + TOP_MARGIN_PX;
  const bottom = useTransform(progress, (p) => `calc(${p * 100}% - ${p * balloonHeightPx}px)`);

  useEffect(() => {
    if (status !== 'CRASHED') return;
    const el = wrapRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      // rect.height/2 указал бы на центр ВСЕЙ картинки шара вместе с
      // корзиной на верёвках — конфетти вылетало бы из пустого места ниже
      // самого шара. 0.36 — та же доля высоты, что и у .balloon-burst в
      // CSS (см. комментарий там), выравнивает оба эффекта на "тушку" шара.
      confetti({
        particleCount: 70,
        spread: 100,
        startVelocity: 30,
        gravity: 1.1,
        scalar: 0.9,
        colors: THEME_CONFETTI[theme] ?? THEME_CONFETTI.green,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height * 0.36) / window.innerHeight,
        },
      });
    }
    playPopSound();
  }, [status, theme]);

  return (
    <div className="flight-path">
      <div className="flight-trail" />
      <motion.div ref={wrapRef} className="flight-balloon" style={{ bottom }}>
        <div className={`flight-balloon-inner ${popped ? 'is-popping' : ''}`}>
          <Balloon theme={theme} size={size} className={popped ? 'is-popped-hidden' : ''} />
          {popped && <BalloonBurst theme={theme} size={size} />}
        </div>
      </motion.div>
    </div>
  );
}
