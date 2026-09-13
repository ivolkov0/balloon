import SmartImage from './SmartImage.jsx';
import Icon from './Icon.jsx';

// Вертикальная шкала уровней с шаром, поднимающимся вдоль неё. boosterLine
// (номер уровня с бустером) остаётся скрытым от игрока на бэке, пока шар его
// не пересёк — сюда передаётся уже публичный boosterTriggered, а не позиция.
// Структура — та же, что была изначально (тонкая линия + точки-маркеры +
// иконка бустера поверх точки), без rail-капсулы/заливки-прогресса/номеров —
// тот вариант пытался сделать "заметнее", но получилось перегружено;
// вернулись к прежней форме и просто отполировали внешний вид.
export default function LevelTrack({ levelsTotal, levelsPassed, boosterTriggered }) {
  const levels = Array.from({ length: levelsTotal }, (_, i) => i + 1);

  return (
    <div className="level-track">
      <div className="level-track-line" />
      {levels.map((levelNumber) => {
        const passed = levelNumber <= levelsPassed;
        const isBoosterLevel = boosterTriggered && levelNumber === levelsPassed;
        return (
          <div key={levelNumber} className="level-marker" style={{ bottom: `${(levelNumber / levelsTotal) * 100}%` }}>
            <div className={`level-dot ${passed ? 'is-passed' : ''} ${isBoosterLevel ? 'is-booster' : ''}`} />
            {isBoosterLevel && (
              <SmartImage
                src="/images/booster-gift.png"
                alt="Бустер"
                className="booster-icon"
                fallback={<Icon name="bolt" tone="gold" size={16} />}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
