// Многие AI-генераторы (в частности встроенный image-gen в ChatGPT), даже
// когда их прямо просят "transparent background", на деле дают картинку на
// сплошном чёрном фоне с мягким свечением по краям. Этот скрипт превращает
// такой чёрный фон в настоящую прозрачность: тёмные пиксели становятся
// alpha=0, яркие (сам объект) остаются alpha=255, а свечение между ними
// плавно проступает как полупрозрачное — без потери "ауры" вокруг объекта.
//
// Запуск: npm run strip-black-bg -- balloon-red.png balloon-green.png ...
// Без аргументов обрабатывает файлы по умолчанию из TARGETS.

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images');

const DEFAULT_TARGETS = ['balloon-red.png', 'balloon-green.png', 'booster-gift.png'];

// Ниже LOW считаем фоном (alpha=0), выше HIGH — полностью непрозрачным
// объектом (alpha=255), между ними — плавный переход (свечение).
const LOW = 12;
const HIGH = 60;

function smoothstep(lo, hi, x) {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

async function processFile(filePath) {
  // Бэкап оригинала — чтобы можно было пересчитать с другими порогами, не
  // прося пользователя перегенерировать картинку заново.
  const backupDir = path.join(path.dirname(filePath), '_originals');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, path.basename(filePath));
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  const sourcePath = backupPath; // всегда матируем от нетронутого оригинала
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = Math.max(r, g, b);
    out[idx + 3] = Math.round(255 * smoothstep(LOW, HIGH, lum));
  }

  const tmpPath = filePath + '.tmp.png';
  await sharp(out, { raw: { width, height, channels } }).png().toFile(tmpPath);
  fs.renameSync(tmpPath, filePath);
  console.log('✓ прозрачный фон вырезан:', path.basename(filePath));
}

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : DEFAULT_TARGETS;

for (const name of targets) {
  const filePath = path.join(IMAGES_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.log('… пропуск (файла ещё нет):', name);
    continue;
  }
  await processFile(filePath);
}
