import { useState } from 'react';

/**
 * <img> с безопасным откатом: если файл ещё не сгенерирован (404), тихо
 * показывает fallback вместо "битой картинки". Как только реальный PNG
 * появляется в public/images/, компонент сам подхватывает его — код трогать
 * не нужно (см. public/images/README.md).
 */
export default function SmartImage({ src, alt = '', fallback = null, ...imgProps }) {
  const [failed, setFailed] = useState(false);

  if (failed) return fallback;

  return <img src={src} alt={alt} onError={() => setFailed(true)} {...imgProps} />;
}
