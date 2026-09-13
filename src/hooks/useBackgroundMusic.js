import { useEffect, useState } from 'react';

// Трек "Midnight at the Table" — лежит в public/audio, поэтому раздаётся
// Vite'ом по абсолютному пути без импорта как модуля.
const TRACK_SRC = '/audio/midnight-at-the-table.mp3';
const VOLUME = 0.35;
const STORAGE_KEY = 'raketka_music_muted';

// Один <audio>-элемент на всё приложение (не пересоздаём при каждом
// ре-рендере/смене экрана — App.jsx не размонтируется между экранами, но
// на всякий случай храним синглтон на уровне модуля, а не в стейте компонента).
let sharedAudio = null;

function getAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio(TRACK_SRC);
    sharedAudio.loop = true;
    sharedAudio.volume = VOLUME;
  }
  return sharedAudio;
}

function readStoredMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Фоновая музыка на всю игру. По умолчанию включена (можно выключить кнопкой
 * в HUD, см. Icon name="musicOn"/"musicOff") — выбор сохраняется в
 * localStorage и переживает reload.
 *
 * Браузеры блокируют autoplay со звуком до первого жеста пользователя —
 * если play() отклонён политикой, подписываемся на первый клик/тап/нажатие
 * клавиши где угодно в приложении и пробуем снова.
 */
export function useBackgroundMusic() {
  const [muted, setMuted] = useState(readStoredMuted);

  useEffect(() => {
    const audio = getAudio();
    audio.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // localStorage недоступен (приватный режим и т.п.) — выбор просто не переживёт reload
    }
  }, [muted]);

  useEffect(() => {
    const audio = getAudio();
    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();

    const onFirstGesture = () => {
      tryPlay();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, []);

  const toggleMusic = () => setMuted((m) => !m);

  return { musicMuted: muted, toggleMusic };
}
