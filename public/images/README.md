# Как подключить сгенерированный арт

Код уже настроен так, чтобы **автоматически** подхватить файлы из этой папки —
никаких правок кода после того, как ты их сюда положишь, не нужно. Пока файлов
нет, приложение показывает нарисованный кодом fallback (текущий SVG-шар и
градиентное небо) — ничего не сломается.

## Нужные файлы (ровно такие имена)

| Файл | Для чего | Размер/формат |
|---|---|---|
| `balloon-red.png` | Красный шар (везде: выбор темы, ставка, полёт) | PNG, **прозрачный фон**, ≥1024×1536 |
| `balloon-green.png` | Зелёный шар | PNG, **прозрачный фон**, ≥1024×1536 |
| `sky-background.png` | Фон экрана выбора темы (небо, острова, облака) | PNG/JPG, портретная ориентация, ≥1200×1800 |

Кладёшь файл — жди пересборки dev-сервера (Vite сам подхватит, если он уже
запущен через `npm run dev`, обновление страницы браузера покажет новую
картинку сразу).

## Промпты для генерации (любая модель — ChatGPT/DALL·E, Midjourney, Bing Image
Creator, Stable Diffusion и т.п.)

### 1. `balloon-red.png`

```
A single hot air balloon, 3D rendered, playful cartoon-realistic style,
vibrant RED gradient fabric with a subtle darker red pattern of small
fluffy white cloud shapes printed on the envelope, warm rim lighting from
the upper-left, glossy soft-plastic toy-like material, woven wicker basket
in warm brown tones hanging below on four ropes, small glowing orange-yellow
flame burner visible at the basket rim, three-quarter front view, floating
in mid-air, isolated on a fully transparent background, no ground, no
shadow plane, no text, no watermark, no other objects, centered composition
with generous padding around the balloon, soft ambient occlusion under the
envelope where it meets the ropes, high detail, studio-quality game asset
render, vertical image
```

### 2. `balloon-green.png`

Тот же промпт, только меняешь `RED` → `GREEN` (и "darker red pattern" →
"darker green pattern"). **Важно генерировать в том же чате/сессии сразу
после красного шара** и явно попросить модель: *"Same exact style, lighting,
basket, rope and flame design as the previous balloon — only change the
envelope color to green."* — так шары получатся стилистически парными, а не
как два случайных рендера из разных генераций.

```
A single hot air balloon, 3D rendered, playful cartoon-realistic style,
vibrant GREEN gradient fabric with a subtle darker green pattern of small
fluffy white cloud shapes printed on the envelope, warm rim lighting from
the upper-left, glossy soft-plastic toy-like material, woven wicker basket
in warm brown tones hanging below on four ropes, small glowing orange-yellow
flame burner visible at the basket rim, three-quarter front view, floating
in mid-air, isolated on a fully transparent background, no ground, no
shadow plane, no text, no watermark, no other objects, centered composition
with generous padding around the balloon, soft ambient occlusion under the
envelope where it meets the ropes, high detail, studio-quality game asset
render, vertical image
```

### 3. `sky-background.png`

```
A whimsical fantasy sky scene for a mobile game background, bright blue sky
gradient fading to soft white near the horizon, warm golden sunlight glow
in one upper corner, several fluffy white cumulus clouds at different
depths, two or three floating magical islands with lush green treetops and
rocky cliff undersides, a couple of small waterfalls streaming off the
edges of the floating islands into misty clouds below, a few small birds
flying in the distance, painterly digital illustration style, soft depth of
field, vibrant but airy color palette, no text, no watermark, no characters,
no balloons, no UI elements, portrait orientation, high resolution, seamless
edges suitable as a full-bleed app background
```

Если после генерации фон получился с посторонними объектами по центру
(например, персонажем) — попроси перегенерировать с уточнением "empty sky,
no foreground subject, composition weighted to the edges so the center stays
open for UI content".

### 4-5. `balloon-red-pop.png` / `balloon-green-pop.png` — САМЫЙ весомый арт из всех

Это единственный крупный визуал в игре, для которого до сих пор нет вообще
никакого арта — момент краха (обязательный сценарий 3 из ТЗ, "анимация
взрыва/сдувания шара") сейчас рисуется только кодом: рваные кусочки резины,
летящие в стороны (см. `BalloonBurst.jsx`). Если положить сюда картинку —
она на долю секунды вспыхнет по центру взрыва, под разлетающимися кусочками,
и именно этот кадр эксперт увидит в каждом проигрышном раунде на демо.
Формат — как у обычных шаров: PNG, **прозрачный фон**, ≥1024×1536.

Генерируй сразу после (или вместо) обычных `balloon-red.png`/`balloon-green.png`
в том же чате, с явной просьбой сохранить материал и цвет фабрики шара:

```
POP MOMENT (RED, после обычного красного шара в том же чате — сохрани
материал и цвет фабрики):
The same hot air balloon as before, but captured at the exact instant it
bursts — the fabric envelope torn into several large jagged flaps peeling
outward from a bright flash at the center, ragged rubber-like edges, a few
small loose fragments scattered around the main tear, wicker basket and ropes
still visible below sagging slightly, dynamic mid-explosion pose, same
glossy toy-like 3D render style and RED color palette as the intact balloon,
isolated on a fully transparent background, no ground, no shadow plane, no
text, no watermark, centered composition with generous padding, high detail,
studio-quality game asset render, vertical image
```

```
POP MOMENT (GREEN, тот же принцип — "same style as the previous red pop,
only green"):
The same hot air balloon as before, but captured at the exact instant it
bursts — the fabric envelope torn into several large jagged flaps peeling
outward from a bright flash at the center, ragged rubber-like edges, a few
small loose fragments scattered around the main tear, wicker basket and ropes
still visible below sagging slightly, dynamic mid-explosion pose, same
glossy toy-like 3D render style and GREEN color palette as the intact
balloon, isolated on a fully transparent background, no ground, no shadow
plane, no text, no watermark, centered composition with generous padding,
high detail, studio-quality game asset render, vertical image
```

## Тир 2 — длинная панорама игрового экрана (самый долгий экран в демо!)

Шар реально **летит вдоль одной цельной картинки** — код скроллит её вверх по
мере роста коэффициента (земля внизу картинки видна в начале полёта, космос
наверху картинки — на максимуме), а не переключает между двумя фото. Поэтому
нужна **одна ОЧЕНЬ высокая** панорама на тему, где переход "земля → небо →
космос" нарисован как один непрерывный сюжет, без шва посередине.

| Файл | Тема |
|---|---|
| `sky-journey-green.png` | зелёная |
| `sky-journey-red.png` | красная |

Формат: PNG/JPG, **сильно вытянутая портретная панорама**, соотношение сторон
примерно **1:4 или 1:5** (например 1080×5000, или 900×4500) — чем выше, тем
плавнее будет казаться скролл. **Без балунов и без UI** — чистый задник.

Большинство генераторов не умеют напрямую в такое вытянутое соотношение —
если модель ограничивает aspect ratio, сгенерируй в максимально вытянутом
доступном варианте (многие держат до 1:2 — Midjourney умеет `--ar 1:3` и
шире) и склей 2-3 сегмента встык (ground→sky, sky→space) в любом
редакторе/самой моделью через image-to-image "continue this scene upward" —
главное, чтобы стык был плавным, без резкой границы.

```
GREEN theme, full journey:
An ultra-tall vertical panorama for a mobile game background, one continuous
seamless scene with no visible seams or hard breaks, depicting a journey
from ground level to outer space. BOTTOM third: bright cheerful daytime
sky just above rolling green hills and treetops, warm morning sunlight, calm
mood matching a "safe, stable" green game theme. MIDDLE third: soft cumulus
clouds thinning out as the view rises, sky gradually shifting from bright
blue to deeper teal. TOP third: transitioning into the upper atmosphere and
outer space, deep teal-to-indigo-to-near-black gradient, scattered stars,
soft aurora-like glow near the very top. Smooth continuous color gradient
and lighting transition throughout, no abrupt cuts between sections,
painterly digital illustration, no text, no characters, no UI, no balloons,
extremely tall portrait aspect ratio (around 1:4), full-bleed background
```

```
RED theme, full journey:
An ultra-tall vertical panorama for a mobile game background, one continuous
seamless scene with no visible seams or hard breaks, depicting a journey
from ground level to outer space. BOTTOM third: dramatic warm sunset sky
just above rugged orange-lit cliffs, glowing golden-orange clouds, sense of
heat and risk matching a "high-risk, high-reward" red game theme. MIDDLE
third: the warm orange gradually deepening into magenta and purple as the
view rises, clouds thinning out. TOP third: transitioning into the upper
atmosphere and outer space, deep magenta-to-purple-to-near-black gradient,
scattered stars, a faint warm glow lingering near the very top. Smooth
continuous color gradient and lighting transition throughout, no abrupt cuts
between sections, painterly digital illustration, no text, no characters, no
UI, no balloons, extremely tall portrait aspect ratio (around 1:4),
full-bleed background
```

## Тир 3 — экран результата (самый эмоциональный момент демо)

| Файл | Для чего |
|---|---|
| `victory-ribbon.png` | лента-баннер за заголовком "Победа!" |
| `defeat-ribbon.png` | лента-баннер за заголовком "Шар лопнул!" |

**Важно: лента должна быть ПУСТОЙ, без текста** — текст рисует React поверх
(так он остаётся точным и на русском). Прозрачный фон, PNG, широкий формат
(≈800×300), лента по центру с прозрачными полями по краям.

```
VICTORY:
A festive ribbon banner graphic for a mobile game victory screen, gold and
green ribbon with slightly folded/waving fabric ends, a small trophy or star
ornament at the top center, glossy game-UI style, empty flat surface in the
center of the ribbon left blank for text to be added later (no text, no
letters, no numbers anywhere on it), transparent background, wide aspect
ratio, isolated graphic, no other elements
```

```
DEFEAT:
A ribbon banner graphic for a mobile game "not this time" / try-again
screen, muted red-grey ribbon with slightly folded/waving fabric ends, subtle
cracked-glass or deflated-balloon ornament at the top center (not scary, just
playful), glossy game-UI style, empty flat surface in the center of the
ribbon left blank for text to be added later (no text, no letters, no
numbers anywhere on it), transparent background, wide aspect ratio, isolated
graphic, no other elements
```

## Тир 4 — бустер и награды (задействованы в сценариях 4 и 2/3)

| Файл | Для чего |
|---|---|
| `booster-gift.png` | иконка на уровне с бустером (шкала полёта) |
| `reward-puzzle-a.png` / `-b` / `-c` / `-d` | 4 фрагмента пазла-награды на экране результата |

```
BOOSTER ICON:
A small glowing gift-box power-up icon for a mobile game, purple-and-gold
treasure chest or gift box with a lightning bolt symbol on it, glossy 3D
render, radiant glow/sparkle around it, transparent background, square
composition, centered, no text, no watermark, game UI asset
```

Для 4 фрагментов пазла — генерируй все 4 в одном чате подряд, прося:
*"same exact puzzle piece shape and rendering style as before, just change
the accent color/pattern to distinguish piece #2/#3/#4"*, чтобы они читались
как один набор, а не разные картинки:

```
PUZZLE REWARD PIECE (A — используй BLUE accent):
A single jigsaw puzzle piece icon, 3D glossy game-asset render, classic
puzzle-piece silhouette with interlocking tabs, BLUE gradient color with a
subtle sparkle/shine, transparent background, square composition, centered,
no text, no watermark
```
(для B/C/D меняй BLUE на PURPLE / ORANGE / TEAL соответственно, в остальном
промпт идентичен)

## Тир 5 — HUD-значки (лого, монета, кубок/правила/история)

`Icon.jsx` теперь сам подхватывает PNG по имени значка **везде**, где он
используется (баланс, чипы в игре, история, экран результата, пазл) — не
только на экране темы. Значки квадратные, ≈64×64, фон прозрачный.

| Файл | Для чего |
|---|---|
| `logo.png` | полноценный логотип "Воздушный Шар" в HUD (заменяет иконку-талисман + текст) |
| `coin-icon.png` | монета баланса бонусов |
| `trophy-icon.png` | кнопка турнира |
| `rules-icon.png` | кнопка правил |
| `history-icon.png` | кнопка истории |

`logo.png` — единственный НЕ квадратный файл в этом тире: это готовый
логотип-графика (значок + название одним изображением, как на фирменной
обложке брифа), ставится в HUD как есть, без подложки рядом. Прозрачный фон,
широкий горизонтальный формат (≈500×200 или похожий), высота на экране
фиксирована (~46px), ширина — по пропорциям картинки.

```
![alt text](image.png)

```
COIN ICON:
A single game currency coin icon, glossy gold coin with a subtle embossed
star or balloon emblem in the center, warm gold-to-amber gradient, bright
highlight arc across the top edge, thick beveled rim, 3D glossy render,
transparent background, square composition, centered, no text, no watermark,
game UI asset, crisp and readable at small sizes
```

Генерируй трофей/книгу/часы **подряд в одном чате**, каждый раз явно прося
сохранить стиль предыдущего:

```
TROPHY ICON:
A small glossy trophy cup icon for a mobile game HUD button, gold cup with
two curved handles on a short pedestal base, warm gold gradient with bright
specular highlight, 3D toy-like render, thick soft dark outline, transparent
background, square composition, centered, no text, no watermark, game UI
asset, crisp and readable at 64x64
```

```
RULES ICON (после трофея, в том же чате):
An open book icon in the exact same style as the previous trophy icon — same
lighting, same gold-and-cream color palette, same thick soft outline and
glossy 3D render — open storybook with a small quill or bookmark ribbon,
transparent background, square composition, centered, no text, no watermark,
game UI asset
```

```
HISTORY ICON (после книги, в том же чате):
A small pocket-watch / clock icon in the exact same style as the previous two
icons — same lighting, palette and glossy 3D render, silver-and-white metal
case clock face with simple hour markers, transparent background, square
composition, centered, no text, no watermark, game UI asset
```

## Тир 6 — остальные игровые иконки (бустер, очки, награда, успех)

Тот же принцип: `Icon.jsx` подхватывает их автоматически везде, где сейчас
нарисован векторный значок (чипы ставки/бустера, очки на экране результата,
плашка "Выигрыш зафиксирован"). Квадрат, ≈64×64, прозрачный фон. Генерируй
все пять подряд в одном чате для единого стиля.

| Файл | Для чего |
|---|---|
| `bolt-icon.png` | молния бустера (чип ставки, вспышка "Бустер сработал!") |
| `star-icon.png` | звезда бонусных баллов (инфо-чип на экране темы) |
| `shield-icon.png` | щит игровых очков |
| `gift-icon.png` | подарок-награда (инфо-чип, значок наград) |
| `check-icon.png` | галочка "Выигрыш зафиксирован" на кнопке cashout |

```
BOLT ICON:
A small lightning bolt power-up icon for a mobile game, glossy purple-and-gold
bolt shape with a bright electric glow and sparkle around the edges, 3D
toy-like render, thick soft dark outline, transparent background, square
composition, centered, no text, no watermark, game UI asset, crisp and
readable at small sizes
```

```
STAR ICON (тот же чат, попроси сохранить стиль):
A small five-point star icon for a mobile game currency/points badge, glossy
gold star with a bright highlight streak and soft sparkle, 3D toy-like
render, thick soft dark outline, transparent background, square composition,
centered, no text, no watermark, game UI asset
```

```
SHIELD ICON (тот же чат):
A small shield icon with a checkmark in the center for a mobile game score
badge, glossy blue gradient shield with a bright white checkmark, 3D toy-like
render, thick soft dark outline, transparent background, square composition,
centered, no text, no watermark, game UI asset
```

```
GIFT ICON (тот же чат):
A small wrapped gift box icon for a mobile game reward badge, glossy purple
box with a gold ribbon bow on top, sparkle accents, 3D toy-like render, thick
soft dark outline, transparent background, square composition, centered, no
text, no watermark, game UI asset
```

```
CHECK ICON (тот же чат):
A small green circular checkmark badge icon for a mobile game success state,
glossy green circle with a bold white checkmark and a subtle highlight arc,
3D toy-like render, thick soft dark outline, transparent background, square
composition, centered, no text, no watermark, game UI asset
```

Все файлы из тиров 2-6 код уже ждёт по указанным именам — просто клади в эту
папку, ничего больше делать не нужно.

## Тир 7 — редизайн экрана ставки по референсу (объёмный PNG-арт)

**В отличие от тиров 2-6, эти файлы код пока НЕ ждёт** — компонентов для них
ещё нет, я допишу код (сделаю их кликабельными/наложу текст поверх), когда
файлы появятся в этой папке. Здесь только то, что чистым CSS не сделать
достаточно похоже на референс (глянец, объёмные бейджи, искры). Всё, что
CSS уже воспроизводит близко к референсу — кнопка "Начать полёт", плашка
"Правила", баннер "Потенциальный выигрыш", рибоны "Популярно"/"Премиум" —
осталось кодом, картинки под них генерировать не нужно.

Общий стиль — тот же "глянцевый 3D-игрушечный рендер" (glossy 3D toy-like
render), что и у уже сгенерированных иконок/шаров в этой папке, чтобы новый
арт не смотрелся отдельным набором. Там, где значение динамическое (число,
сумма ставки) — картинка оставляется ПУСТОЙ в этом месте, текст рисует React
поверх (тот же приём, что у victory/defeat-лент в Тире 3).

### 7.1 Бейдж "выбрано" на карточке шара (must-have)

Комбинация герб+корона+галочка в углу активной карточки — самое сложное
место референса для чистого CSS, один универсальный ассет на обе темы (цвет
самого бейджа золотой независимо от шара).

| Файл | Размер |
|---|---|
| `theme-selected-badge.png` | PNG, прозрачный фон, ≈256×256 (на экране ~56×56) |

```
A small "selected" achievement badge icon for a mobile game, combining a
gold shield crest shape topped with a tiny gold crown ornament, with a bold
white checkmark centered on the shield face, glossy 3D toy-like render, warm
gold-to-amber gradient, bright specular highlight arc, thick soft dark
outline, subtle sparkle accents around the crown points, transparent
background, square composition, centered, no text, no watermark, game UI
asset, crisp and readable at 56x56
```

### 7.2 Иконки уровней — лист (зелёная тема) и огонь (красная тема) (must-have)

Генерируй оба подряд в одном чате.

| Файл | Размер |
|---|---|
| `level-icon-leaf.png` | PNG, прозрачный фон, ≈128×128 |
| `level-icon-flame.png` | PNG, прозрачный фон, ≈128×128 |

```
LEAF ICON:
A small single leaf icon for a mobile game stat badge, glossy bright green
leaf with a visible central vein line, subtle gradient from light green to
deeper green, thick soft dark outline, small highlight sparkle, transparent
background, square composition, centered, no text, no watermark, game UI
asset, crisp and readable at small sizes
```

```
FLAME ICON (тот же чат — "same exact outline weight and rendering style as
the previous leaf icon, only change the shape to a flame and the palette to
warm orange-red"):
A small single flame/fire icon for a mobile game stat badge, glossy gradient
from bright yellow-orange core to deep red-orange tips, thick soft dark
outline matching the previous leaf icon, small highlight sparkle,
transparent background, square composition, centered, no text, no
watermark, game UI asset, crisp and readable at small sizes
```

### 7.3 Карточки ставок — 4 фона (must-have, самое весомое из тира)

Это то, что сильнее всего отличает референс от текущего CSS — стеклянный
глянец с диагональным бликом. Генерируй все 4 подряд в одном чате, каждый
раз явно прося сохранить форму/материал/блик/тень предыдущей и поменять
только палитру. **Нижние две трети каждой карточки оставляй пустой ровной
заливкой** — туда React положит сумму, "баллов" и чип ×N (плюс рибон
"Популярно"/"Премиум" на 3-й и 4-й, он уже рисуется кодом поверх и цепляется
за угол картинки).

| Файл | Ставка | Палитра |
|---|---|---|
| `bet-card-tier1.png` | 50 / ×1 | синяя |
| `bet-card-tier2.png` | 150 / ×2 | бирюзово-зелёная |
| `bet-card-tier3.png` | 300 / ×3 | оранжевая |
| `bet-card-tier4.png` | 600 / ×4 | фиолетовая |

Размер каждого: PNG, прозрачный фон вокруг скруглённого прямоугольника,
≈800×960 (портретная карточка, отображается ~180×210, запас под retina).

```
TIER 1 (BLUE):
A rounded-rectangle game UI card background, vertical portrait shape with
softly rounded corners (about 20% corner radius), glossy 3D toy-like plastic
material, vivid BLUE gradient from light sky-blue at top to deep
royal-blue at bottom, bright diagonal glass-like specular sheen across the
upper half, a small embossed glossy gold coin icon near the top center,
thin lighter-blue inner border highlight, soft drop shadow baked at the
bottom edge, transparent background outside the rounded card shape, the
lower two-thirds of the card left as a completely clean empty gradient
surface with NO text, no numbers, no letters, no icons there (that area
gets text added later), no watermark, centered composition, game UI asset
```

```
TIER 2 (в том же чате — "same exact card shape, material, coin icon, sheen
and shadow style as the previous blue card, only change the color palette
to a vivid TEAL-GREEN gradient"):
[тот же промпт, BLUE → TEAL-GREEN]
```

```
TIER 3 (в том же чате, тот же приём — "...ORANGE-to-amber gradient..."):
[тот же промпт, BLUE → ORANGE-TO-AMBER]
```

```
TIER 4 (в том же чате, тот же приём — "...PURPLE-to-violet gradient..."):
[тот же промпт, BLUE → PURPLE-TO-VIOLET]
```

### 7.4 Бейдж коллекции пазла (для будущей плашки "Собрано: X/4")

На референсе есть панель "Собрано: 3/4" — в текущем приложении такой фичи
ещё нет (это отдельная задача на потом), но иконку можно сгенерировать уже
сейчас, чтобы не возвращаться к этому тиру повторно.

| Файл | Размер |
|---|---|
| `collection-badge-icon.png` | PNG, прозрачный фон, ≈128×128 |

```
A small glossy jigsaw puzzle piece badge icon for a mobile game
collection-progress panel, single puzzle piece silhouette with interlocking
tabs, cyan-to-blue gradient, bright specular highlight, thick soft dark
outline, small sparkle accent, transparent background, square composition,
centered, no text, no watermark, game UI asset, crisp at small sizes
```

### 7.5 Пилюли исхода в истории — "Успех" / "Crash" (для будущего редизайна истории)

Тоже задел на будущее (сейчас история — простой список). Текст короткий и
не меняется — можно рискнуть вписать его в саму картинку, но безопаснее
(надёжнее рендерится) сгенерировать пилюлю ПУСТОЙ и положить слово поверх
кодом, как остальные бейджи с динамическим текстом в этом проекте.

| Файл | Размер |
|---|---|
| `history-success-pill.png` | PNG, прозрачный фон, ≈320×160 |
| `history-crash-pill.png` | PNG, прозрачный фон, ≈320×160 |

```
SUCCESS PILL (пусто, без текста):
A small rounded pill-shaped badge background for a mobile game history
list, glossy mint-green gradient capsule shape with a bright top highlight
streak and a thin lighter-green border, transparent background, wide short
rectangle composition, no text, no numbers, no watermark, completely empty
surface — a short word will be overlaid on top later, game UI asset
```

```
CRASH PILL (тот же чат — "same exact capsule shape, highlight and border
style as the previous pill, only change the palette to a muted red-grey
gradient"):
A small rounded pill-shaped badge background for a mobile game history
list, glossy muted red-grey gradient capsule shape with a bright top
highlight streak and a thin lighter border, transparent background, wide
short rectangle composition, no text, no numbers, no watermark, completely
empty surface — a short word will be overlaid on top later, game UI asset
```

### 7.6 Опционально — то, что уже неплохо получается в CSS

Ниже — если всё же хочется того самого "объёмного" глянца именно на этих
элементах. Не приоритет: текущая CSS-версия (см. предыдущий редизайн
`BetScreen.jsx`) уже похожа на референс, генерировать есть смысл только для
полировки перед демо.

| Файл | Размер | Заметка |
|---|---|---|
| `start-flight-btn.png` | ≈1200×340 | Текст "НАЧАТЬ ПОЛЁТ" статичный (не меняется) — можно вписать в картинку, но если текст получится кривым, проще оставить кнопку как есть в CSS |
| `rules-pill-btn.png` | ≈480×180 | Аналогично, текст "ПРАВИЛА" статичный |
| `win-banner-frame.png` | ≈1200×280 | Пустая рамка с золотыми искрами по краю, текст поверх — кодом |

```
START BUTTON (если решишь генерировать — текст статичный, можно вписать):
A wide glossy 3D game button, rounded pill shape, vivid red-to-orange
gradient from bright coral-orange at top to deep red at bottom, a thick
bright gold decorative ring border, bright diagonal glass-like specular
sheen across the upper half, small sparkle accents near the corners, bold
chunky rounded game-display lettering reading "НАЧАТЬ ПОЛЁТ" in white with
a soft dark outline, embossed 3D look, transparent background outside the
button shape, wide rectangle composition, no watermark, game UI asset
```

```
RULES PILL (в том же чате — "same exact glossy button material and gold
ring style as the previous button, smaller pill size"):
A small glossy 3D game pill button, semi-transparent light blue-white
glass material, thin bright border highlight, bold rounded game-display
lettering reading "ПРАВИЛА" in dark navy, small embossed open-book icon to
the left of the text, transparent background outside the pill shape, wide
short rectangle composition, no watermark, game UI asset
```

```
WIN BANNER FRAME (пусто, без текста):
A wide rounded rectangle game UI banner frame, semi-transparent pale-gold
glass material, a thick bright gold sparkly border with small star-glint
accents at the corners, soft warm glow, completely empty flat interior
with NO text, no numbers, no icons (content will be added on top later),
transparent background outside the frame shape, wide rectangle
composition, no watermark, game UI asset
```

Клади готовые файлы сюда по этим именам — когда будут готовы хотя бы
7.1-7.3 (must-have), скажи, и я допишу `BetScreen.jsx`/`PuzzlePiece.jsx`,
чтобы они подхватились и стали кликабельными (как у `PuzzlePiece.jsx` —
`SmartImage` с фолбэком на текущий CSS-вариант, так что до появления
картинок ничего не сломается).

## Тир 8 — раздельные слои фона главной (небо / облака / острова)

Готово, файлы уже сгенерированы и лежат в работе — брались из
`public/images/_originals/` и скопированы сюда под именами, которые ждёт
`SkyBackdrop.jsx`:

| Файл | Источник в `_originals/` |
|---|---|
| `bg-sky.png` | `ChatGPT_Image_13_sent_2026_g__21_22_40.png` |
| `bg-cloud-1.png` | `ChatGPT_Image_13_sent_2026_g__21_42_55__kopia.png` |
| `bg-cloud-2.png` | `ChatGPT_Image_13_sent_2026_g__21_43_01.png` |
| `bg-cloud-3.png` | `ChatGPT_Image_13_sent_2026_g__21_44_00_1.png` |
| `bg-island.png` | `ChatGPT_Image_13_sent_2026_g__21_49_15__kopia.png` |

Остров один файл — на экране он используется дважды с разным `size`
("два острова разного размера" сделаны масштабированием одного арта, не
двумя отдельными картинками). Если когда-нибудь появится отдельный
маленький остров — положи его как `bg-island-2.png` и подставь вторым
`src` в `Island` внутри `SkyBackdrop.jsx`.
