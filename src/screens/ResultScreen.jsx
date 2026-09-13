import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import SmartImage from '../components/SmartImage.jsx';
import Icon from '../components/Icon.jsx';
import { PUZZLE_LABELS } from '../components/PuzzleCollection.jsx';

const REWARD_TONES = {
  PUZZLE_A: 'blue',
  PUZZLE_B: 'purple',
  PUZZLE_C: 'gold',
  PUZZLE_D: 'green',
};

const REWARD_ICONS = {
  PUZZLE_A: '/images/reward-puzzle-a.png',
  PUZZLE_B: '/images/reward-puzzle-b.png',
  PUZZLE_C: '/images/reward-puzzle-c.png',
  PUZZLE_D: '/images/reward-puzzle-d.png',
};

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ResultScreen({ round, current, onPlayAgain }) {
  const won = current?.cashoutMultiplier != null;

  useEffect(() => {
    if (!current) return;
    if (won) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.4 },
        colors: round?.theme === 'red' ? ['#e24b4a', '#f0b400', '#ffffff'] : ['#35a06b', '#f0b400', '#ffffff'],
      });
    }
    // Отдельный "золотой" залп за собранный полный комплект пазла — вне
    // зависимости от win/loss, это отдельное достижение (см. п.1.5 ТЗ).
    if (current.setCompleted) {
      setTimeout(() => {
        confetti({
          particleCount: 140,
          spread: 100,
          startVelocity: 45,
          origin: { y: 0.5 },
          colors: ['#2f86d6', '#8a4fd4', '#f0952a', '#21a68c'],
        });
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!round || !current) return null;

  return (
    <div className="screen result-screen">
      <motion.div
        className="card result-card"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <svg className="countdown-ring" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r={RING_RADIUS} fill="none" stroke="var(--surface-muted)" strokeWidth="3" />
          <motion.circle
            cx="17"
            cy="17"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            transition={{ duration: 10, ease: 'linear' }}
            transform="rotate(-90 17 17)"
          />
        </svg>

        <div
          className="result-ribbon"
          style={{ backgroundImage: `url(${won ? '/images/victory-ribbon.png' : '/images/defeat-ribbon.png'})` }}
        />
        <h2 className={`result-title ${won ? 'win' : 'crash'}`}>{won ? 'Победа!' : 'Шар лопнул!'}</h2>


        {won ? (
          <>
            {/* cashoutMultiplier/missedMultiplier от сервера уже включают
                бустер (если сработал) — betAmount ещё раз им не умножаем,
                см. README бэка п.6.6/14.5 (там же описан старый баг с
                двойным умножением, который это исправляет). */}
            <div className="result-amount">
              +{Math.round(round.betAmount * current.cashoutMultiplier)} баллов
            </div>
            <p className="muted">зафиксировано на ×{current.cashoutMultiplier.toFixed(2)}</p>
            {current.missedMultiplier && (
              <div className="missed-bubble">
                Могли выиграть: {Math.round(round.betAmount * current.missedMultiplier)} баллов (шар
                долетел до ×{current.missedMultiplier.toFixed(2)})
              </div>
            )}
          </>
        ) : (
          <>
            <div className="result-amount" style={{ color: 'var(--danger)' }}>
              −{round.betAmount} баллов
            </div>
            <p className="muted">крах на ×{current.crashMultiplier?.toFixed(2)}</p>
          </>
        )}

        <div className="row-between result-points">
          <span className="row" style={{ gap: 6 }}>
            <Icon name="shield" tone="blue" size={22} />
            <span className="muted">Очки за раунд</span>
          </span>
          <strong>+{current.pointsEarned}</strong>
        </div>

        {current.reward && (
          <div style={{ marginTop: 10 }}>
            <span className="reward-badge">
              <SmartImage
                src={REWARD_ICONS[current.reward]}
                alt=""
                className="reward-icon"
                fallback={<Icon name="puzzle" tone={REWARD_TONES[current.reward] ?? 'gold'} size={30} />}
              />
              {PUZZLE_LABELS[current.reward] ?? current.reward} — в коллекцию
            </span>
          </div>
        )}

        {current.setCompleted && (
          <div className="set-complete-banner">
            <Icon name="trophy" tone="gold" size={20} />
            Полный комплект собран! Бонус очков уже начислен выше.
          </div>
        )}

        {current.serverSeed && (
          <p
            className="fairness-note"
            title={`До старта был показан хеш seedHash=${round.seedHash}. Проверка: SHA-256(serverSeed) должен совпасть с ним.`}
          >
            <Icon name="shield" tone="silver" size={14} /> Честная игра: seed {current.serverSeed.slice(0, 10)}… ·
            hash {round.seedHash?.slice(0, 10)}…
          </p>
        )}

        <button className="primary-btn" style={{ width: '100%', marginTop: 18 }} onClick={onPlayAgain}>
          Играть снова
        </button>
      </motion.div>
    </div>
  );
}
