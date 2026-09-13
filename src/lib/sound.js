// Звук хлопка шара — синтезируется на лету через Web Audio API, без внешнего
// mp3/ogg файла (в проекте пока нет папки под звуковые ассеты, а короткий
// "поп" достаточно простой сигнал, чтобы не тащить бинарник в репозиторий).
let sharedCtx = null;

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  // На части браузеров AudioContext стартует в состоянии "suspended", пока
  // не было явного жеста пользователя — к моменту краша он уже был (ставка
  // жмётся кликом), но на всякий случай подталкиваем.
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

export function playPopSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Тональная составляющая: резкая просадка высоты — даёт ощущение "хлопка".
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain).connect(ctx.destination);

    // Шумовая составляющая поверх тона — имитирует треск лопнувшей резины.
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
    noise.start(now);
    noise.stop(now + 0.12);
  } catch {
    // Звук не критичен для геймплея — тихо игнорируем (например, если Web
    // Audio недоступен или заблокирован политикой автоплея).
  }
}

// Короткий "тик" при пересечении уровня (п.1.3 ТЗ: "+X" сопровождается
// звуковым эффектом) — восходящий чистый тон, чтобы не спутать со взрывом.
export function playLevelUpSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // см. playPopSound
  }
}

// Звуковой сигнал активации бустера (п.1.4 ТЗ) — двухтональный "власть-ап",
// заметно ярче/длиннее обычного level-up, чтобы выделяться на его фоне.
export function playBoosterSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.09].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const base = i === 0 ? 440 : 660;
      osc.frequency.setValueAtTime(base, now + delay);
      osc.frequency.exponentialRampToValueAtTime(base * 2, now + delay + 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
      osc.connect(gain).connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.24);
    });
  } catch {
    // см. playPopSound
  }
}

// Случайный "чирик" — фон экрана выбора темы (п.1.1 ТЗ: раз в 1.8-5 сек).
export function playBirdChirpSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chirps = 2 + Math.floor(Math.random() * 2); // 2-3 коротких чирика подряд
    for (let i = 0; i < chirps; i++) {
      const start = now + i * 0.09;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const base = 2200 + Math.random() * 800;
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 1.4, start + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
      osc.connect(gain).connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.08);
    }
  } catch {
    // см. playPopSound
  }
}

// Короткая "капля воды" при выборе темы (п.1.1 ТЗ).
export function playWaterDropSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // см. playPopSound
  }
}
