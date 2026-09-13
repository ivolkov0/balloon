import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useTransform } from 'framer-motion';

/**
 * Длинная панорама, которая скроллится под шаром по мере роста высоты.
 *
 * Реальные пропорции картинки (какими бы они ни оказались после генерации)
 * меряются через JS — картинка никогда не растягивается, скроллится ровно
 * настолько, насколько реально высокая по сравнению с контейнером.
 *
 * Сдвиг берётся из того же MotionValue, что и позиция шара (useSmoothFlight),
 * поэтому фон едет непрерывно в 60fps, а не дёргается раз в 400мс вместе с
 * ответами сервера.
 */
export default function JourneyBackdrop({ src, progress }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [maxScroll, setMaxScroll] = useState(0);
  const [failed, setFailed] = useState(false);

  const y = useTransform(progress, (p) => -maxScroll * (1 - p));

  const measure = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const renderedHeight = (containerWidth / img.naturalWidth) * img.naturalHeight;
    setMaxScroll(Math.max(0, renderedHeight - containerHeight));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, src]);

  if (failed) return null;

  return (
    <div ref={containerRef} className="journey-backdrop">
      <motion.img
        ref={imgRef}
        src={src}
        alt=""
        className="journey-backdrop-img"
        style={{ y }}
        onLoad={measure}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
