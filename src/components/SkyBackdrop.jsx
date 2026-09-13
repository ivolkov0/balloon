import { useState } from 'react';
import SmartImage from './SmartImage.jsx';

// Декоративный фон: небо + острова + 1-3 облака + 1-3 птицы по случайным
// траекториям, генерируются заново при каждом монтировании экрана (п. 1.1 ТЗ).
// Птицы летят быстрее облаков — создаёт эффект глубины.
//
// Небо/облака/острова — теперь отдельные PNG-слои (см. public/images/README.md,
// тир "Слои фона"), каждый со своим "дыханием" (лёгкое покачивание вверх-вниз +
// едва заметное масштабирование, не полёт и не статика). Пока файла нет —
// SmartImage тихо откатывается на текущий нарисованный кодом SVG, ничего не
// ломается.
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

const CLOUD_IMAGES = ['/images/bg-cloud-1.png', '/images/bg-cloud-2.png', '/images/bg-cloud-3.png'];

function makeClouds() {
  const count = 1 + Math.floor(Math.random() * 3); // 1..3
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    src: CLOUD_IMAGES[i % CLOUD_IMAGES.length],
    top: randomBetween(6, 55),
    scale: randomBetween(0.7, 1.4),
    driftDuration: randomBetween(26, 42),
    driftDelay: randomBetween(-20, 0),
    breatheDuration: randomBetween(5, 8),
    breatheDelay: randomBetween(-6, 0),
  }));
}

function makeBirds() {
  const count = 1 + Math.floor(Math.random() * 3); // 1..3
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: randomBetween(8, 40),
    duration: randomBetween(6, 11),
    delay: randomBetween(-8, 0),
    reverse: Math.random() > 0.5,
    flapDuration: randomBetween(0.35, 0.6),
  }));
}

function CloudArt({ scale }) {
  return (
    <svg width={90 * scale} height={40 * scale} viewBox="0 0 90 40" style={{ opacity: 0.9 }}>
      <ellipse cx="24" cy="24" rx="20" ry="14" fill="#ffffff" />
      <ellipse cx="46" cy="16" rx="18" ry="16" fill="#ffffff" />
      <ellipse cx="66" cy="24" rx="16" ry="12" fill="#ffffff" />
      <ellipse cx="45" cy="28" rx="30" ry="10" fill="#ffffff" />
    </svg>
  );
}

function Cloud({ src, top, scale, driftDuration, driftDelay, breatheDuration, breatheDelay }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}%`,
        left: 0,
        animation: `drift-x ${driftDuration}s linear infinite`,
        animationDelay: `${driftDelay}s`,
        willChange: 'transform',
      }}
    >
      {/* Отдельная обёртка для "дыхания" — своя анимация transform, не
          конфликтует с горизонтальным дрейфом на родителе. */}
      <div
        style={{
          animation: `cloud-breathe ${breatheDuration}s ease-in-out infinite`,
          animationDelay: `${breatheDelay}s`,
        }}
      >
        <SmartImage
          src={src}
          alt=""
          style={{ display: 'block', width: 90 * scale, height: 'auto', opacity: 0.95 }}
          fallback={<CloudArt scale={scale} />}
        />
      </div>
    </div>
  );
}

function Bird({ top, duration, delay, reverse, flapDuration }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}%`,
        left: 0,
        animation: `drift-x ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        animationDirection: reverse ? 'reverse' : 'normal',
        transform: reverse ? 'scaleX(-1)' : 'none',
        willChange: 'transform',
      }}
    >
      <svg
        width="22"
        height="12"
        viewBox="0 0 22 12"
        style={{ animation: `flap-wings ${flapDuration}s ease-in-out infinite` }}
      >
        <path
          d="M1,6 Q6,0 11,6 Q16,0 21,6"
          stroke="rgba(30,30,40,0.55)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function IslandArt({ size = 220 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 112">
      <ellipse cx="70" cy="100" rx="46" ry="8" fill="rgba(20,20,40,0.08)" />
      <path d="M28,58 Q70,88 112,58 L100,78 Q70,96 40,78 Z" fill="#8a6a45" />
      <path d="M24,56 Q70,30 116,56 Q104,68 70,70 Q36,68 24,56 Z" fill="#6fbf6f" />
      <ellipse cx="50" cy="52" rx="10" ry="8" fill="#4f9f52" />
      <ellipse cx="86" cy="50" rx="12" ry="9" fill="#5aad5c" />
    </svg>
  );
}

function Island({ side, top, size, edgeOffset, src, breatheDuration, breatheDelay }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}%`,
        [side]: edgeOffset,
        animation: `drift-island ${breatheDuration}s ease-in-out infinite`,
        animationDelay: `${breatheDelay}s`,
        opacity: 0.95,
      }}
    >
      <SmartImage
        src={src}
        alt=""
        style={{ display: 'block', width: size, height: 'auto' }}
        fallback={<IslandArt />}
      />
    </div>
  );
}

// Ладдер фолбэков для неба: новый слой bg-sky.png -> старый цельный
// PNG-задник sky-background.png (если он ещё лежит с прошлой версии) ->
// просто CSS-градиент из .sky-backdrop.
const SKY_SOURCES = ['/images/bg-sky.png', '/images/sky-background.png'];

export default function SkyBackdrop({ withIslands = true }) {
  const [clouds] = useState(makeClouds);
  const [birds] = useState(makeBirds);
  const [skyLevel, setSkyLevel] = useState(0);

  const skySrc = skyLevel < SKY_SOURCES.length ? SKY_SOURCES[skyLevel] : null;

  return (
    <div className="sky-backdrop">
      <div className="sky-sun" />
      {skySrc && (
        <>
          <div className="sky-photo" style={{ backgroundImage: `url(${skySrc})` }} />
          {/* Невидимый проверочный <img>: у background-image нет onError,
              поэтому статус грузим отдельно и по 404 сдвигаем ладдер выше. */}
          <img
            src={skySrc}
            alt=""
            style={{ display: 'none' }}
            onError={() => setSkyLevel((lvl) => lvl + 1)}
          />
        </>
      )}
      {withIslands && (
        <>
          {/* Один и тот же арт острова, два инстанса разного размера — как на
              старом цельном фоне: крупные, у самых краёв экрана, наполовину
              срезанные границей (реально выходят за viewport через отрицательный
              edgeOffset, не просто прижаты к краю). */}
          <Island
            side="right"
            top={6}
            size="clamp(260px, 62vw, 460px)"
            edgeOffset="-22%"
            src="/images/bg-island.png"
            breatheDuration={7}
            breatheDelay={0}
          />
          <Island
            side="left"
            top={44}
            size="clamp(200px, 50vw, 370px)"
            edgeOffset="-18%"
            src="/images/bg-island.png"
            breatheDuration={8.5}
            breatheDelay={-3}
          />
        </>
      )}
      {clouds.map((cl) => (
        <Cloud key={cl.id} {...cl} />
      ))}
      {birds.map((b) => (
        <Bird key={b.id} {...b} />
      ))}
    </div>
  );
}
