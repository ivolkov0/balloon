import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const PALETTE = {
  green: { light: '#c8f7dd', base: '#3fb578', dark: '#155c39', shadow: '#0a3d26' },
  red: { light: '#ffc9b8', base: '#e5534f', dark: '#8f2323', shadow: '#5c1414' },
};

// Яркость каждой вертикальной панели (0..1), имитирует свет из верхнего левого
// угла на цилиндрической/сферической поверхности — даёт объём вместо плоской
// заливки. Используется ТОЛЬКО как fallback, пока нет настоящего PNG-арта
// (см. public/images/README.md — как подключить сгенерированные картинки).
const BAND_BRIGHTNESS = [0.08, 0.22, 0.42, 0.68, 0.92, 1.0, 0.82, 0.58, 0.36, 0.2, 0.1];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function bandColor(c, brightness) {
  return brightness < 0.5 ? mix(c.dark, c.base, brightness * 2) : mix(c.base, c.light, (brightness - 0.5) * 2);
}

const ENVELOPE_PATH =
  'M60,6 C93,6 104,42 104,70 C104,104 84,124 60,130 C36,124 16,104 16,70 C16,42 27,6 60,6 Z';

function BalloonSvgFallback({ theme, size, floatDuration, className, style }) {
  const uid = useId();
  const duration = floatDuration ?? 3.2 + Math.random() * 1.6;
  const c = PALETTE[theme];
  const clipId = `clip-${uid}`;
  const flameId = `flame-${uid}`;
  const blurId = `blur-${uid}`;

  const bands = useMemo(() => {
    const x0 = 15;
    const x1 = 105;
    const n = BAND_BRIGHTNESS.length;
    const w = (x1 - x0) / n;
    return BAND_BRIGHTNESS.map((b, i) => ({
      x: x0 + i * w - 0.4,
      width: w + 0.8,
      fill: bandColor(c, b),
    }));
  }, [c]);

  return (
    <motion.svg
      viewBox="0 0 120 172"
      width={size}
      height={(size * 172) / 120}
      className={`balloon-graphic ${className}`}
      style={{ ...style, animationDuration: `${duration}s` }}
      initial={false}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={ENVELOPE_PATH} />
        </clipPath>
        <radialGradient id={flameId} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff6c8" />
          <stop offset="45%" stopColor="#ffbe3d" />
          <stop offset="100%" stopColor="#ff7a1f" />
        </radialGradient>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* конверт: вертикальные полосы света/тени, обрезанные по силуэту шара */}
      <g clipPath={`url(#${clipId})`}>
        {bands.map((band, i) => (
          <rect key={i} x={band.x} y="0" width={band.width} height="172" fill={band.fill} />
        ))}
        <ellipse cx="60" cy="118" rx="46" ry="20" fill={c.shadow} opacity="0.22" />
        <ellipse cx="76" cy="50" rx="11" ry="6.5" fill="#ffffff" opacity="0.28" />
        <ellipse cx="44" cy="86" rx="10" ry="6" fill="#ffffff" opacity="0.2" />
      </g>

      <ellipse cx="40" cy="32" rx="14" ry="22" fill="#ffffff" opacity="0.22" filter={`url(#${blurId})`} />
      <path d={ENVELOPE_PATH} fill="none" stroke={c.shadow} strokeOpacity="0.5" strokeWidth="1.4" />
      {[-0.62, -0.22, 0.22, 0.62].map((t) => (
        <path
          key={t}
          d={`M60,9 Q${60 + 42 * t},68 60,127`}
          fill="none"
          stroke={c.shadow}
          strokeOpacity="0.28"
          strokeWidth="1.1"
        />
      ))}

      <path d="M40,118 L34,146" stroke="#7a5a37" strokeWidth="1.6" fill="none" />
      <path d="M80,118 L86,146" stroke="#7a5a37" strokeWidth="1.6" fill="none" />
      <path d="M52,124 L46,146" stroke="#7a5a37" strokeWidth="1.4" fill="none" />
      <path d="M68,124 L74,146" stroke="#7a5a37" strokeWidth="1.4" fill="none" />

      <ellipse cx="60" cy="140" rx="11" ry="14" fill="#ffb347" opacity="0.4" filter={`url(#${blurId})`} />
      <ellipse className="balloon-flame" cx="60" cy="140" rx="6.5" ry="10" fill={`url(#${flameId})`} />

      <rect x="34" y="146" width="52" height="22" rx="5" fill="#8a6a45" />
      <rect x="34" y="146" width="52" height="6" rx="3" fill="#6b4f31" />
      <rect x="34" y="162" width="52" height="6" rx="3" fill="#6b4f31" opacity="0.7" />
    </motion.svg>
  );
}

/**
 * Шар темы. Сначала пытается показать настоящий PNG-арт из
 * /public/images/balloon-{theme}.png (сгенерированный по промптам из
 * public/images/README.md). Если файла ещё нет — 404 тихо ловится onError,
 * и рендерится нарисованный кодом SVG-fallback, без "битой картинки".
 */
export default function Balloon({ theme = 'green', size = 96, floatDuration, className = '', style }) {
  const [imageFailed, setImageFailed] = useState(false);
  const duration = floatDuration ?? 3.2 + Math.random() * 1.6;

  if (imageFailed) {
    return (
      <BalloonSvgFallback theme={theme} size={size} floatDuration={duration} className={className} style={style} />
    );
  }

  return (
    <motion.img
      src={`/images/balloon-${theme}.png`}
      alt={theme === 'red' ? 'Красный шар' : 'Зелёный шар'}
      onError={() => setImageFailed(true)}
      className={`balloon-graphic ${className}`}
      style={{ ...style, width: size, height: 'auto', animationDuration: `${duration}s`, objectFit: 'contain' }}
      initial={false}
    />
  );
}
