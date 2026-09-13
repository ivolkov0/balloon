import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LevelTrack from '../components/LevelTrack.jsx';
import Multiplier from '../components/Multiplier.jsx';
import FlightBalloon from '../components/FlightBalloon.jsx';
import JourneyBackdrop from '../components/JourneyBackdrop.jsx';
import Icon from '../components/Icon.jsx';
import { useSmoothFlight } from '../hooks/useSmoothFlight.js';
import { playLevelUpSound, playBoosterSound } from '../lib/sound.js';

const ONBOARDING_SEEN_KEY = 'raketka_cashout_onboarding_seen';

export default function GameScreen({
  theme,
  levelsTotal,
  levelThresholds,
  pointsPerLine,
  round,
  current,
  anchor,
  onCashout,
  musicMuted,
  onToggleMusic,
}) {
  const [shaking, setShaking] = useState(false);
  const [pointsPopup, setPointsPopup] = useState(null); // {key, amount}
  const [showOnboarding, setShowOnboarding] = useState(false);
  const prevLevelsRef = useRef(0);
  const prevBoosterRef = useRef(false);
  const popupSeqRef = useRef(0);

  // Мини-онбординг у кнопки «Забрать» — один раз за браузер, 4 секунды,
  // затем плавно скрывается (п.1.3 ТЗ).
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
    } catch {
      // localStorage недоступен — просто не показываем повторно в рамках этой сессии
    }
    if (seen) return undefined;
    setShowOnboarding(true);
    const t = setTimeout(() => {
      setShowOnboarding(false);
      try {
        localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (current?.status === 'CRASHED') {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [current?.status]);

  // "+X" за пересечение уровня (п.1.3 ТЗ) — звук + всплывающее число.
  useEffect(() => {
    const levelsPassed = current?.levelsPassed ?? 0;
    if (levelsPassed > prevLevelsRef.current && pointsPerLine) {
      const gained = (levelsPassed - prevLevelsRef.current) * pointsPerLine;
      popupSeqRef.current += 1;
      setPointsPopup({ key: popupSeqRef.current, amount: gained });
      playLevelUpSound();
    }
    prevLevelsRef.current = levelsPassed;
  }, [current?.levelsPassed, pointsPerLine]);

  // Звук бустера — один раз в момент срабатывания (визуальная вспышка уже была).
  useEffect(() => {
    if (current?.boosterTriggered && !prevBoosterRef.current) {
      playBoosterSound();
    }
    prevBoosterRef.current = current?.boosterTriggered ?? false;
  }, [current?.boosterTriggered]);

  // Потолок для нормализации прогресса фона/шара (0..1 в useSmoothFlight) —
  // бэкенд не отдаёт maxMultiplier (внутренняя математика, см. README бэка
  // п.5), поэтому берём верхний порог уровня темы с запасом на рост после
  // него (шар может улететь заметно выше последнего уровня до краха).
  const lastThreshold = levelThresholds?.at(-1) ?? 10;
  const ceiling = lastThreshold * 1.6;

  const { progress, multiplier } = useSmoothFlight({
    anchorMultiplier: anchor?.multiplier,
    anchorAt: anchor?.at,
    anchorRate: anchor?.rate,
    ceiling,
    status: current?.status,
    finalMultiplier: current?.status === 'CRASHED' ? current.crashMultiplier : null,
  });

  if (!current || !round) return null;

  const canCashout = current.canCashout === true;
  // Реальный бэк НЕ завершает раунд в момент cashout — шар продолжает лететь
  // до настоящего краха (см. README бэка п.6.6/8.1), поэтому CASHED_OUT здесь
  // не терминален: экран игры остаётся, кнопка блокируется, полёт продолжается.
  const alreadyCashedOut = current.status === 'CASHED_OUT';

  return (
    <div className={`screen ${shaking ? 'is-shaking' : ''}`}>
      {/* --altitude отдаём тем же MotionValue: звёзды и затемнение проявляются
          так же плавно, как едет фон */}
      <motion.div className="game-sky" style={{ '--altitude': progress }}>
        <JourneyBackdrop src={`/images/sky-journey-${theme}.png`} progress={progress} />
        <div className="stars" />
      </motion.div>

      <div className="game-topbar">
        <span className="chip">
          <Icon name="coin" tone="gold" size={20} />
          {round.betAmount}
          {round.boosterValue > 1 && (
            <>
              <Icon name="bolt" tone="purple" size={19} />×{round.boosterValue}
            </>
          )}
        </span>
        <button className="chip music-chip-btn" onClick={onToggleMusic} title={musicMuted ? 'Включить музыку' : 'Выключить музыку'}>
          <Icon name={musicMuted ? 'musicOff' : 'musicOn'} tone="silver" size={18} />
        </button>
        <span className="chip">Уровней: {levelsTotal}</span>
      </div>

      <div className="game-board">
        <LevelTrack
          levelsTotal={levelsTotal}
          levelsPassed={current.levelsPassed}
          boosterTriggered={current.boosterTriggered}
        />
        <div className="game-readout">
          <div className="game-readout-header">
            <Multiplier value={multiplier} level={current.levelsPassed} />
            <AnimatePresence>
              {pointsPopup && (
                <motion.span
                  key={pointsPopup.key}
                  className="points-popup"
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: -18, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  onAnimationComplete={() => setPointsPopup((p) => (p?.key === pointsPopup.key ? null : p))}
                >
                  +{pointsPopup.amount}
                </motion.span>
              )}
            </AnimatePresence>
            {current.boosterTriggered && (
              <span className="booster-flash">
                <Icon name="bolt" tone="gold" size={20} />
                Бустер сработал!
              </span>
            )}
            {alreadyCashedOut && (
              <span className="cashed-note">
                Забрано на ×{current.cashoutMultiplier.toFixed(2)}. Могли бы забрать больше — шар всё
                ещё летит.
              </span>
            )}
          </div>
          <FlightBalloon theme={theme} progress={progress} status={current.status} size={168} />
        </div>
      </div>

      <div className="cashout-btn-wrap">
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              className="cashout-onboarding-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              Нажми «Забрать» до того, как шар лопнет
              <span className="cashout-onboarding-arrow">↓</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          className={`primary-btn cashout-btn ${canCashout && !alreadyCashedOut ? 'is-pulsing' : ''}`}
          disabled={!canCashout || alreadyCashedOut}
          onClick={onCashout}
        >
          {alreadyCashedOut ? (
            <>
              <Icon name="check" tone="green" size={24} />
              Выигрыш зафиксирован
            </>
          ) : (
            'Забрать'
          )}
        </button>
      </div>
    </div>
  );
}
