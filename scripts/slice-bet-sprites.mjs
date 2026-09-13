// Разовый скрипт: режет public/images/_originals/bet-sprite-sheet.png (лист
// объектов, сгенерированный по промптам из Тира 7 в public/images/README.md)
// на отдельные именованные файлы прямо в public/images/. Координаты подобраны
// вручную по сетке (см. bet-sprite-sheet-grid.png рядом с исходником).
//
// Запуск: node scripts/slice-bet-sprites.mjs

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'public', 'images', '_originals', 'bet-sprite-sheet.png');
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'images');

// { left, top, width, height } — прямоугольник в пикселях исходного листа (1536x1024)
const CROPS = {
  'theme-selected-badge.png': { left: 10, top: 50, width: 245, height: 325 },
  'level-icon-leaf.png': { left: 260, top: 150, width: 160, height: 185 },
  'level-icon-flame.png': { left: 448, top: 135, width: 168, height: 210 },
  'bet-card-tier1.png': { left: 622, top: 88, width: 218, height: 324 },
  'bet-card-tier2.png': { left: 856, top: 88, width: 202, height: 324 },
  'bet-card-tier3.png': { left: 1076, top: 88, width: 214, height: 324 },
  'bet-card-tier4.png': { left: 1298, top: 88, width: 212, height: 324 },
  'balloon-name-pill-green.png': { left: 18, top: 440, width: 308, height: 125 },
  'balloon-name-pill-red.png': { left: 348, top: 440, width: 332, height: 125 },
  'collection-badge-icon.png': { left: 698, top: 415, width: 188, height: 205 },
  'win-banner-frame.png': { left: 898, top: 418, width: 622, height: 202 },
  'start-flight-btn.png': { left: 14, top: 604, width: 792, height: 196 },
  'rules-pill-btn.png': { left: 848, top: 648, width: 414, height: 122 },
  'back-theme-pill.png': { left: 8, top: 836, width: 324, height: 120 },
  'balance-pill-art.png': { left: 344, top: 836, width: 348, height: 120 },
  'collection-progress-frame.png': { left: 702, top: 824, width: 430, height: 136 },
  'history-success-pill.png': { left: 1142, top: 848, width: 190, height: 98 },
  'history-crash-pill.png': { left: 1338, top: 848, width: 184, height: 98 },
};

for (const [name, box] of Object.entries(CROPS)) {
  await sharp(SRC).extract(box).toFile(path.join(OUT_DIR, name));
  console.log('✓', name);
}

console.log('Готово. Проверь public/images/*.png — если у какого-то файла криво обрезан край,');
console.log('поправь его box в CROPS выше (см. bet-sprite-sheet-grid.png) и перезапусти.');
