import { useId, useState } from 'react';

/**
 * Единый набор игровых иконок вместо системных эмодзи.
 *
 * Эмодзи выглядели дёшево и вразнобой (каждая ОС рисует их по-своему) рядом с
 * 3D-артом шаров. Здесь всё нарисовано в одном языке: сплошная заливка с
 * градиентом, тёмная обводка, скруглённая «пухлая» геометрия — как в мобильных
 * играх. Размер и цвет задаются снаружи, поэтому один и тот же значок
 * одинаково хорошо смотрится и в HUD, и на кнопке.
 *
 * ICON_ART: если для значка сгенерирован PNG (public/images/, см.
 * public/images/README.md), <Icon name="coin" /> сам подхватит картинку
 * ВЕЗДЕ, где используется — правки компонентов не нужны. Пока файла нет,
 * рисуется векторная форма ниже (see SHAPES).
 */
const ICON_ART = {
  coin: '/images/coin-icon.png',
  trophy: '/images/trophy-icon.png',
  book: '/images/rules-icon.png',
  clock: '/images/history-icon.png',
  bolt: '/images/bolt-icon.png',
  star: '/images/star-icon.png',
  shield: '/images/shield-icon.png',
  gift: '/images/gift-icon.png',
  check: '/images/check-icon.png',
};

const GRADIENTS = {
  gold: ['#ffd75e', '#f0a500'],
  silver: ['#e8edf5', '#b3bdcc'],
  red: ['#ff7b6b', '#d13b38'],
  green: ['#7ddba0', '#2f8f5b'],
  purple: ['#c98bf5', '#7b3fb5'],
  blue: ['#7cc4f7', '#2f7fc4'],
  paper: ['#fff3d6', '#e8c88a'],
};

function Defs({ id, tone }) {
  const [from, to] = GRADIENTS[tone] ?? GRADIENTS.gold;
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
  );
}

const STROKE = 'rgba(60, 35, 10, 0.55)';

const SHAPES = {
  // монета бонусных баллов
  coin: (fill) => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={fill} stroke={STROKE} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.8" fill="rgba(255,255,255,0.35)" />
      <path
        d="M12 7.4v9.2M9.6 9.4h3.6a1.9 1.9 0 010 3.8H9.6h3.8a1.9 1.9 0 010 3.8H9.6"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // кубок турнира
  trophy: (fill) => (
    <>
      <path
        d="M7 4h10v4.2a5 5 0 01-10 0V4z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 5.4H4.6v1.4a3 3 0 002.7 3M17 5.4h2.4v1.4a3 3 0 01-2.7 3"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 13.2v3.4" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8.4 20.4c0-1.6 1.3-2.6 3.6-2.6s3.6 1 3.6 2.6z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  // книга правил
  book: (fill) => (
    <>
      <path
        d="M4 5.2c2.6-1.1 5.3-1.1 8 0v13c-2.7-1.1-5.4-1.1-8 0v-13z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.2c-2.6-1.1-5.3-1.1-8 0v13c2.7-1.1 5.4-1.1 8 0v-13z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 5.2v13" stroke={STROKE} strokeWidth="1.6" />
    </>
  ),
  // часы истории
  clock: (fill) => (
    <>
      <circle cx="12" cy="12" r="9" fill={fill} stroke={STROKE} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="6.2" fill="rgba(255,255,255,0.4)" />
      <path d="M12 7.8V12l3 1.9" fill="none" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // звезда бонусов
  star: (fill) => (
    <path
      d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.8z"
      fill={fill}
      stroke={STROKE}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  // щит игровых очков
  shield: (fill) => (
    <>
      <path
        d="M12 3.2l7 2.6v5.4c0 4.3-2.9 7.7-7 9.6-4.1-1.9-7-5.3-7-9.6V5.8z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // подарок-награда
  gift: (fill) => (
    <>
      <path d="M3.6 10.4h16.8v3H3.6z" fill={fill} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.2 13.4h13.6v7H5.2z" fill={fill} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 10.4v10" stroke={STROKE} strokeWidth="1.6" />
      <path
        d="M12 10.2c-2.6 0-4.4-.7-4.4-2.3S9 5.2 12 10.2zM12 10.2c2.6 0 4.4-.7 4.4-2.3S15 5.2 12 10.2z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  // фрагмент пазла
  puzzle: (fill) => (
    <path
      d="M9.6 4.2h4.8v1.6a1.7 1.7 0 103.4 0V4.2h2.2v4.6h-1.4a1.7 1.7 0 100 3.4h1.4v7.6h-4.6v-1.4a1.7 1.7 0 10-3.4 0v1.4H4.2v-4.8h1.6a1.7 1.7 0 100-3.4H4.2V8.8h5.4z"
      fill={fill}
      stroke={STROKE}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  // молния бустера
  bolt: (fill) => (
    <path
      d="M13.6 2.6L5.4 13.4h5l-1 8 8.2-10.8h-5z"
      fill={fill}
      stroke={STROKE}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  // галочка
  check: (fill) => (
    <>
      <circle cx="12" cy="12" r="9" fill={fill} stroke={STROKE} strokeWidth="1.6" />
      <path d="M7.8 12.4l2.8 2.8 5.6-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // плюс (пополнить баланс)
  plus: (fill) => (
    <>
      <circle cx="12" cy="12" r="9" fill={fill} stroke={STROKE} strokeWidth="1.6" />
      <path d="M12 7.6v8.8M7.6 12h8.8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  // стрелка назад
  back: (fill) => (
    <path
      d="M14.4 5.6L8 12l6.4 6.4"
      fill="none"
      stroke={fill}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  // динамик со звуковыми волнами — музыка включена
  musicOn: (fill) => (
    <>
      <path
        d="M4 9.6h3.4L12 5.6v12.8L7.4 14.4H4z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 8.6a5 5 0 010 6.8M18.2 6.2a8.6 8.6 0 010 11.6"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  // динамик с крестиком — музыка выключена
  musicOff: (fill) => (
    <>
      <path
        d="M4 9.6h3.4L12 5.6v12.8L7.4 14.4H4z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 9.4l4.4 4.4M20 9.4l-4.4 4.4"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  ),
  // стрелка вперёд
  forward: (fill) => (
    <path
      d="M9.6 5.6L16 12l-6.4 6.4"
      fill="none"
      stroke={fill}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export default function Icon({ name, tone = 'gold', size = 22, className = '', style }) {
  const uid = useId();
  const gradId = `ic-${uid}`;
  const shape = SHAPES[name];
  const [artFailed, setArtFailed] = useState(false);
  const art = ICON_ART[name];

  if (!shape) return null;

  if (art && !artFailed) {
    return (
      <img
        src={art}
        alt=""
        width={size}
        height={size}
        className={`game-icon ${className}`}
        style={{ objectFit: 'contain', ...style }}
        onError={() => setArtFailed(true)}
      />
    );
  }

  // у стрелок нет заливки-градиента — они рисуются одним цветом
  const isStroke = name === 'back' || name === 'forward';
  const fill = isStroke ? 'currentColor' : `url(#${gradId})`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`game-icon ${className}`}
      style={style}
      aria-hidden="true"
    >
      {!isStroke && <Defs id={gradId} tone={tone} />}
      {shape(fill)}
    </svg>
  );
}
