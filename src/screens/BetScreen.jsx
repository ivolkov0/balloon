import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SkyBackdrop from '../components/SkyBackdrop.jsx';
import SmartImage from '../components/SmartImage.jsx';
import Icon from '../components/Icon.jsx';
import Balloon from '../components/Balloon.jsx';
import PuzzlePiece from '../components/PuzzlePiece.jsx';
import HistoryList from '../components/HistoryList.jsx';
import RulesModal from '../components/RulesModal.jsx';
import PuzzleCollectionModal, { CollectionBadge } from '../components/PuzzleCollection.jsx';

// Циклическая палитра для чипов "последние полёты" — просто разные цвета по
// кругу (как в референсе), не завязана на результат раунда: там важна пёстрая
// мозаика чисел, а не win/crash-семантика (она и так читается по самому числу).
const FLIGHT_CHIP_TONES = ['blue', 'green', 'gold', 'purple'];

const THEME_META = {
  green: { name: 'Зелёный шар', rgb: '53, 160, 107', cardArt: '/images/balloon-select-card-green.png' },
  red: { name: 'Красный шар', rgb: '226, 75, 74', cardArt: '/images/balloon-select-card-red.png' },
};

// Стикеры на 3-й и 4-й ставке — как раньше.
const BET_BADGES = [
  null,
  null,
  { text: '🔥 Популярно', variant: 'popular' },
  { text: '👑 Премиум', variant: 'premium' },
];

// Экран ставки собираем заново с нуля, поэтапно.
// Шаг 1 — кнопка "Темы" сверху.
// Шаг 2 — таблетка баланса.
// Шаг 3 — выбор шара: сама картинка (шар + рамка + плашка + прогресс уже
// нарисованы внутри неё) — без своей CSS-подложки/плашки вокруг, только
// hover/tap/selected-анимация поверх.
// Шаг 4 — панель "Выберите ставку": liquid-glass CSS-плашка того же
// насыщенно-синего цвета, что и остальные HUD-элементы (balance-pill-vivid),
// вместо картинки — карточки ставок (PuzzlePiece, готовый арт с прошлого
// шага) стоят на ней.
export default function BetScreen({
  theme,
  setTheme,
  balance,
  betOptions,
  levelsTotal,
  history,
  puzzlePieces,
  setsCompleted,
  onStart,
  onBack,
  musicMuted,
  onToggleMusic,
}) {
  const [selected, setSelected] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [insufficientNotice, setInsufficientNotice] = useState(false);

  const handleSelect = (fragmentId, betAmount) => {
    setSelected({ fragmentId, betAmount });
  };

  // «Не хватает бонусов» (п.1.2 ТЗ) — короткий тост на 2 секунды при клике
  // по недоступному по балансу фрагменту.
  useEffect(() => {
    if (!insufficientNotice) return undefined;
    const t = setTimeout(() => setInsufficientNotice(false), 2000);
    return () => clearTimeout(t);
  }, [insufficientNotice]);

  const canStart = selected != null && selected.betAmount <= balance;

  return (
    <div className="screen bet-hero-screen">
      <SkyBackdrop withIslands={false} />

      <div className="hud-top-row">
        <motion.button
          className="back-pill-btn"
          onClick={onBack}
          title="Назад к выбору шара"
          whileTap={{ scale: 0.92, y: 2 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          <SmartImage
            src="/images/back-theme-pill.png"
            alt="Назад к темам"
            className="back-pill-art"
            fallback={<span className="back-pill-fallback">‹ Темы</span>}
          />
        </motion.button>

        <button
          className="icon-btn glass-panel"
          onClick={onToggleMusic}
          title={musicMuted ? 'Включить музыку' : 'Выключить музыку'}
        >
          <Icon name={musicMuted ? 'musicOff' : 'musicOn'} tone="silver" size={22} className="hud-icon-img" />
        </button>

        <div className="hud-balance-slot">
          <span className="balance-pill-vivid">
            <Icon name="coin" tone="gold" size={30} className="coin-icon-lg" />
            <span className="balance-pill-number-text">{balance.toLocaleString('ru-RU')}</span>
            <span className="balance-plus-btn">
              <Icon name="plus" tone="gold" size={20} />
            </span>
          </span>
        </div>
      </div>

      <div className="balloon-select">
        {['green', 'red'].map((id) => {
          const meta = THEME_META[id];
          const active = theme === id;

          return (
            <motion.button
              key={id}
              type="button"
              className="balloon-select-card"
              data-active={active}
              style={{ '--glow-rgb': meta.rgb }}
              animate={{ scale: active ? 1.05 : 1 }}
              whileHover={{ scale: active ? 1.08 : 1.05, y: -3 }}
              whileTap={{ scale: active ? 1.02 : 0.95, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              onClick={() => setTheme(id)}
            >
              <SmartImage
                src={meta.cardArt}
                alt={meta.name}
                className="balloon-select-card-art"
                fallback={<Balloon theme={id} size={140} />}
              />
            </motion.button>
          );
        })}
      </div>

      <div className="bet-panel-frame">
        <div className="row-between" style={{ alignItems: 'center' }}>
          <strong className="bet-panel-title">Выберите ставку</strong>
          <button className="rules-link-btn" onClick={() => setRulesOpen(true)} title="Правила игры">
            <Icon name="book" tone="paper" size={18} />
            Правила
          </button>
        </div>

        <div className="puzzle-grid">
          {betOptions.map((opt, i) => (
            <PuzzlePiece
              key={opt.fragmentId}
              index={i}
              fragmentId={opt.fragmentId}
              betAmount={opt.betAmount}
              boosterValue={opt.boosterValue}
              badge={BET_BADGES[i]?.text}
              badgeVariant={BET_BADGES[i]?.variant}
              selected={selected?.fragmentId === opt.fragmentId}
              affordable={opt.betAmount <= balance}
              onSelect={handleSelect}
              onInsufficient={() => setInsufficientNotice(true)}
            />
          ))}
        </div>

        <AnimatePresence>
          {insufficientNotice && (
            <motion.div
              className="insufficient-toast"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              Не хватает бонусов
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        className="start-flight-btn"
        data-active={canStart}
        disabled={!canStart}
        whileHover={canStart ? { scale: 1.04 } : undefined}
        whileTap={canStart ? { scale: 0.95 } : undefined}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        onClick={() => canStart && onStart(selected.fragmentId)}
      >
        <SmartImage
          src="/images/start-flight-btn.png"
          alt="Начать полёт"
          className="start-flight-btn-art"
          fallback={
            <span className="start-flight-btn-fallback">
              <Balloon theme={theme} size={26} />
              Начать полёт
            </span>
          }
        />
      </motion.button>

      <AnimatePresence>{rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}</AnimatePresence>

      {history.length > 0 && (
        <div className="recent-flights">
          <strong className="recent-flights-title">Последние полёты</strong>
          <div className="recent-flights-row">
            {history.slice(0, 5).map((item, i) => {
              const mult = item.result === 'WIN' ? item.cashoutMultiplier : item.crashMultiplier;
              const tone = FLIGHT_CHIP_TONES[i % FLIGHT_CHIP_TONES.length];
              return (
                <span key={i} className={`recent-flight-chip is-${tone}`}>
                  ×{mult?.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="history-panel-frame">
        <div className="row-between" style={{ alignItems: 'center' }}>
          <strong className="bet-panel-title">
            <Icon name="clock" tone="silver" size={18} />
            История игр
          </strong>
          <CollectionBadge puzzlePieces={puzzlePieces} onOpen={() => setCollectionOpen(true)} />
        </div>
        <HistoryList history={history} />
      </div>

      <AnimatePresence>
        {collectionOpen && (
          <PuzzleCollectionModal
            puzzlePieces={puzzlePieces}
            setsCompleted={setsCompleted}
            onClose={() => setCollectionOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
