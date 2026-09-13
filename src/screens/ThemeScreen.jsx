import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Balloon from '../components/Balloon.jsx';
import SkyBackdrop from '../components/SkyBackdrop.jsx';
import RulesModal from '../components/RulesModal.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import SmartImage from '../components/SmartImage.jsx';
import Icon from '../components/Icon.jsx';
import { playBirdChirpSound, playWaterDropSound } from '../lib/sound.js';

// Отдельный стартовый экран выбора темы (п. 1.1 ТЗ, дополнительная
// возможность). Оба шара парят непрерывно с несинхронизированной анимацией
// (Balloon.jsx сам рандомизирует длительность на инстанс), фон генерирует
// птиц/облака заново при каждом заходе на экран (см. SkyBackdrop.jsx).
export default function ThemeScreen({ balance, history, gameConfig, onSelectTheme, musicMuted, onToggleMusic }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Случайный звук птицы каждые 1.8-5 сек, не перекрывая другие звуки
  // (п.1.1 ТЗ) — таймер живёт только пока пользователь на этом экране.
  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      const delay = 1800 + Math.random() * 3200;
      timeoutId = setTimeout(() => {
        playBirdChirpSound();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleSelectTheme = (themeId) => {
    playWaterDropSound();
    onSelectTheme(themeId);
  };

  return (
    <div className="screen theme-hero-screen">
      <SkyBackdrop />

      {/* Три колонки (лого | баланс | кубок-правила-история) через grid
          1fr auto 1fr — так баланс остаётся ровно по центру строки
          независимо от того, что шире: лого-графика слева или группа из
          трёх иконок справа (flex space-between центрировал бы только при
          равной ширине краёв). Лого — уже готовый логотип-графика (см.
          public/images/README.md), без текста и подложки поверх — само по
          себе не нуждается в стеклянной плашке. */}
      <div className="hud-top-row">
        <div className="hud-logo-slot">
          <SmartImage src="/images/logo.png" alt="Воздушный Шар" className="logo-mark" fallback={null} />
        </div>

        <div className="balance-pill glass-panel hud-balance-center">
          <Icon name="coin" tone="gold" size={40} className="coin-icon-lg" />
          {balance.toLocaleString('ru-RU')}
          <span className="plus-btn">
            <Icon name="plus" tone="gold" size={18} />
          </span>
        </div>

        <div className="hud-icons-group">
          <button className="icon-btn glass-panel" data-disabled="true" title="Турнир — скоро">
            <Icon name="trophy" tone="gold" size={28} className="hud-icon-img" />
          </button>
          <button className="icon-btn glass-panel" onClick={() => setRulesOpen(true)} title="Правила">
            <Icon name="book" tone="paper" size={28} className="hud-icon-img" />
          </button>
          <button className="icon-btn glass-panel" onClick={() => setHistoryOpen(true)} title="История">
            <Icon name="clock" tone="silver" size={28} className="hud-icon-img" />
          </button>
        </div>
      </div>

      {/* Отдельной строкой, а не 4-й иконкой в hud-icons-group — та тройка
          иконок уже впритык подобрана под узкие телефоны (см. комментарий у
          .hud-icons-group в index.css), четвёртая иконка там переполняла ряд. */}
      <div className="music-toggle-row">
        <button
          className="icon-btn glass-panel"
          onClick={onToggleMusic}
          title={musicMuted ? 'Включить музыку' : 'Выключить музыку'}
        >
          <Icon name={musicMuted ? 'musicOff' : 'musicOn'} tone="silver" size={26} className="hud-icon-img" />
        </button>
      </div>

      <div className="theme-hero">
        <h1>Выше риск — больше награда!</h1>
        <p>Два воздушных шара — два уровня риска и наград</p>
      </div>

      {/* Раньше шары стояли на стеклянных карточках — теперь ничего не стоит
          у них за спиной, только небо: сам шар, подпись и бейджи держатся
          на собственных обводках/тенях текста (как заголовок выше). */}
      <div className="balloon-picker">
        {['red', 'green'].map((themeId) => {
          // gameConfig грузится асинхронно (GET /api/config/public) — до
          // первого ответа бейджи просто не рисуем, а не падаем на undefined.
          const themeInfo = gameConfig?.themes?.[themeId];
          const lastThreshold = themeInfo?.levelThresholds?.at(-1);
          const palette =
            themeId === 'red'
              ? { accent: '#e24b4a', light: '#ff9a8c', dark: '#8f2323' }
              : { accent: '#35a06b', light: '#7bd9a6', dark: '#185c3a' };
          return (
            <button
              key={themeId}
              className="balloon-pick"
              style={{
                '--card-accent': palette.accent,
                '--card-accent-light': palette.light,
                '--card-accent-dark': palette.dark,
              }}
              onClick={() => handleSelectTheme(themeId)}
            >
              <Balloon theme={themeId} size={190} />
              <span className="balloon-card-name">{themeId === 'red' ? 'Красный шар' : 'Зелёный шар'}</span>
              {themeInfo && (
                <div className="balloon-card-badges">
                  <span className="balloon-card-badge">{themeInfo.levelsTotal} уровней</span>
                  {lastThreshold != null && (
                    <span className="balloon-card-badge">от ×{lastThreshold.toFixed(1)}</span>
                  )}
                </div>
              )}
              <span className="balloon-card-cta">
                Выбрать
                <Icon name="forward" size={20} />
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>{rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {historyOpen && <HistoryModal history={history} onClose={() => setHistoryOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
