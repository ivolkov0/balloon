import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import SmartImage from './SmartImage.jsx';

// Карточка ставки: сгенерированный глянцевый PNG-фон на тир (см. Тир 7 в
// public/images/README.md — "bet-card-tier1..4.png") поверх тактильной
// CSS-подложки (градиент + грань снизу), которая остаётся ВИДНОЙ, только
// пока картинки нет (SmartImage тихо откатывается, ничего не ломается).
// Сумма/"баллов"/чип ×N — всегда живой React-текст поверх, не запечены в
// картинку: их нельзя перегенерировать, если баланс/тиры вдруг поменяются.
const TIER_TONES = ['blue', 'green', 'gold', 'purple'];
const TIER_COLORS = {
  blue: { light: '#6fc6ff', base: '#2f86d6', dark: '#1f5f9e', edge: '#163f68' },
  green: { light: '#6be0c9', base: '#21a68c', dark: '#147a67', edge: '#0d4f45' },
  gold: { light: '#ffcf6b', base: '#f0952a', dark: '#c06a10', edge: '#8a4a08' },
  purple: { light: '#c99bf7', base: '#8a4fd4', dark: '#6127a0', edge: '#421a70' },
};
const TIER_ART = [
  '/images/bet-card-tier1.png',
  '/images/bet-card-tier2.png',
  '/images/bet-card-tier3.png',
  '/images/bet-card-tier4.png',
];

export default function PuzzlePiece({
  fragmentId,
  betAmount,
  boosterValue,
  selected,
  affordable,
  onSelect,
  onInsufficient,
  index = 0,
  badge = null,
  badgeVariant = 'popular',
}) {
  const tone = TIER_TONES[index % TIER_TONES.length];
  const { light, base, dark, edge } = TIER_COLORS[tone];
  const art = TIER_ART[index % TIER_ART.length];

  // Карточка кликабельна даже без баланса — иначе игрок не понимает, ПОЧЕМУ
  // ничего не происходит (п.1.2 ТЗ: "При попытке нажатия выводится
  // уведомление «Не хватает бонусов»" — это обязательный пункт).
  const handleClick = () => {
    if (affordable) onSelect(fragmentId, betAmount);
    else onInsufficient?.();
  };

  return (
    <motion.button
      type="button"
      className="bet-card"
      data-selected={selected}
      data-disabled={!affordable}
      style={{
        '--tier-light': light,
        '--tier-base': base,
        '--tier-dark': dark,
        '--tier-edge': edge,
      }}
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
    >
      {/* Стикер-бейдж на самом "выгодном" варианте — подсказка не глазами
          искать лучший коэффициент, а сразу видеть его (как в референсе:
          "🔥 Популярно" на ×3, "👑 Премиум" на ×4). */}
      {badge && <span className={`bet-card-sticker is-${badgeVariant}`}>{badge}</span>}

      <SmartImage src={art} alt="" className="bet-card-art" fallback={null} />

      <span className="bet-card-content">
        <span className="bet-amount">{betAmount}</span>
        <span className="bet-unit">баллов</span>

        <span className="bet-booster">
          <Icon name="bolt" tone="gold" size={14} />×{boosterValue}
        </span>
      </span>
    </motion.button>
  );
}
