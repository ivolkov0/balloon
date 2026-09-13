import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import SmartImage from './SmartImage.jsx';

// Коллекция пазла (п.1.5 ТЗ + Критерии, "награда — не декоративная иконка, а
// встроена в механику прогресса"): 4 фрагмента копятся навсегда на сервере
// (User.puzzleX, см. useGameState.js), не только мелькают один раз на экране
// результата. Полный комплект (по 1+ каждого) даёт бонус очков — сервер сам
// решает, когда это случилось (RoundStateResponse.setCompleted).
export const PUZZLE_TYPES = ['PUZZLE_A', 'PUZZLE_B', 'PUZZLE_C', 'PUZZLE_D'];

const PUZZLE_ART = {
  PUZZLE_A: '/images/reward-puzzle-a.png',
  PUZZLE_B: '/images/reward-puzzle-b.png',
  PUZZLE_C: '/images/reward-puzzle-c.png',
  PUZZLE_D: '/images/reward-puzzle-d.png',
};

const PUZZLE_TONES = {
  PUZZLE_A: 'blue',
  PUZZLE_B: 'purple',
  PUZZLE_C: 'gold',
  PUZZLE_D: 'green',
};

export const PUZZLE_LABELS = {
  PUZZLE_A: 'Синий фрагмент',
  PUZZLE_B: 'Фиолетовый фрагмент',
  PUZZLE_C: 'Золотой фрагмент',
  PUZZLE_D: 'Изумрудный фрагмент',
};

function ownedCount(puzzlePieces) {
  return PUZZLE_TYPES.filter((t) => (puzzlePieces?.[t] ?? 0) > 0).length;
}

/** Маленькая полоска-значок — открывает CollectionModal по клику. */
export function CollectionBadge({ puzzlePieces, onOpen }) {
  const owned = ownedCount(puzzlePieces);

  return (
    <button type="button" className="collection-badge" onClick={onOpen}>
      <SmartImage
        src="/images/collection-badge-icon.png"
        alt=""
        className="collection-badge-icon"
        fallback={<Icon name="puzzle" tone="blue" size={22} />}
      />
      <span className="collection-badge-pieces">
        {PUZZLE_TYPES.map((type) => (
          <span
            key={type}
            className="collection-badge-dot"
            data-owned={(puzzlePieces?.[type] ?? 0) > 0}
            style={{ '--dot-tone': `var(--puzzle-${PUZZLE_TONES[type]})` }}
          />
        ))}
      </span>
      <span className="collection-badge-count">{owned}/4</span>
    </button>
  );
}

/** Развёрнутая витрина коллекции — модальное окно. */
export default function PuzzleCollectionModal({ puzzlePieces, setsCompleted, onClose }) {
  return (
    <motion.div
      className="overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3>Коллекция пазла</h3>
          <button className="secondary-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          Каждый раунд приносит случайный фрагмент — соберите все 4, чтобы получить
          бонус очков за полный комплект. Набор не расходуется: копится навсегда.
        </p>

        <div className="puzzle-collection-grid">
          {PUZZLE_TYPES.map((type) => {
            const count = puzzlePieces?.[type] ?? 0;
            const owned = count > 0;
            return (
              <div key={type} className="puzzle-collection-tile" data-owned={owned}>
                <SmartImage
                  src={PUZZLE_ART[type]}
                  alt={PUZZLE_LABELS[type]}
                  className="puzzle-collection-art"
                  fallback={<Icon name="puzzle" tone={owned ? PUZZLE_TONES[type] : 'silver'} size={40} />}
                />
                <span className="puzzle-collection-name">{PUZZLE_LABELS[type]}</span>
                <span className="puzzle-collection-badge">×{count}</span>
              </div>
            );
          })}
        </div>

        <div className="row-between result-points" style={{ marginTop: 14 }}>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="trophy" tone="gold" size={20} />
            <span className="muted">Полных комплектов собрано</span>
          </span>
          <strong>{setsCompleted}</strong>
        </div>
      </motion.div>
    </motion.div>
  );
}
