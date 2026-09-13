# Воздушный Шар — Frontend

React + Vite. Четыре экрана (`ThemeScreen` → `BetScreen` → `GameScreen` → `ResultScreen`),
переключаемые через один `useState` в `App.jsx` — без `react-router`.

Вся игровая логика — в `src/hooks/useGameState.js`. Ходит в реальный Spring Boot backend
(`github.com/NikitSik/raketka`) через `src/api/client.js`: гостевая авторизация по
`X-Session-Token` (токен в `sessionStorage` — своя сессия на каждую вкладку), `GET
/api/config/public` (без auth — фрагменты ставок и пороги уровней, без внутренней
математики), `POST /round/start` → `GET /round/{id}/state` (поллинг ~300мс) → `POST
/round/{id}/cashout`, `GET /history` (глобальная, все игроки), `GET /user`.

**Раунд не завершается в момент cashout** — сервер переводит его в `CASHED_OUT`, шар
продолжает лететь до настоящего краха (см. README бэкенда, п.6.6/8.1). Кнопка «Забрать»
включается строго по серверному `current.canCashout`, не по локальной эвристике.

## Деплой на сервер (прод)

Один `docker-compose.yml` в этом репозитории поднимает всё: Postgres + backend
(`raketka`) + сам фронт (статическая `vite build` за nginx, который проксирует `/api`
на backend — один порт наружу, без CORS). Предполагается, что репозиторий `raketka`
склонирован **рядом**, сиблинг-папкой:

```bash
git clone <frontend-repo-url> BallonFrontend
git clone <raketka-repo-url> raketka
cd BallonFrontend
docker compose up -d --build
```

Открыть `http://<адрес-сервера>/` — это и есть URL для экспертов. Backend дополнительно
доступен на `:8080` (Swagger — `/swagger-ui.html`, кнопка Authorize принимает токен из
`/api/auth/guest`) — для прямых curl-проверок и технической проверяемости backend.

Правки `raketka/config.json` на сервере подхватываются без пересборки образа —
`docker-compose.yml` монтирует файл, а не запекает в образ; после правки:
```bash
TOKEN=$(curl -s -X POST http://localhost/api/auth/guest -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -X POST http://localhost/api/admin/config/reload -H "X-Session-Token: $TOKEN"
```

Логи: `docker compose logs -f backend` / `frontend`. Остановить: `docker compose down`
(volume `pg-data` — данные Postgres — остаётся; `down -v` стирает и его, нужно после
смены структуры сущностей `User`/`Round` в `raketka`).

### Демо-доступ для экспертов

Отдельного логина/пароля не нужно — фронт при первом заходе на страницу сам создаёт
гостевого пользователя (`POST /api/auth/guest`) с балансом **100 000** бонусных баллов
(настраивается через `startingBalance` в `config.json`). Это и есть требуемый
"демонстрационный пользователь с ненулевым балансом" — просто открыть URL.

## Локальная разработка

Нужен Node.js 18+ (на этой машине не на PATH — бинарники по полному пути,
см. `C:\Program Files\nodejs\npm.cmd`).

```bash
npm install
npm run dev
```
Откроется на http://localhost:5173.

Backend поднимается отдельно (репозиторий `raketka`) — на этой машине через Docker
(нет Java 25/Maven на хосте), см. `README-DEV.md` в клоне `raketka`:

```bash
cd ../raketka   # или где склонирован backend
docker compose up -d --build
```

Vite dev-сервер проксирует `/api/**` на `http://localhost:8080` (см. `vite.config.js`,
переменная `VITE_BACKEND_URL` в `.env`) — обязательно, у бэкенда нет CORS. Для прода
эту роль вместо Vite играет nginx (см. выше) — `npm run dev` НЕ используется на сервере.

## Структура

```
Dockerfile         прод-сборка фронта (node build → nginx)
nginx.conf          прокси /api → backend, статика + SPA fallback
docker-compose.yml  весь стек: postgres + backend (../raketka) + frontend
src/
  screens/       ThemeScreen, BetScreen, GameScreen, ResultScreen
  components/    PuzzlePiece, LevelTrack, Multiplier, HistoryList, RulesModal, ...
  hooks/         useGameState.js — весь стейт игрового цикла
                 useSmoothFlight.js — 60fps интерполяция полёта (оценивает скорость
                 роста по двум последним серверным точкам, т.к. growthRate — внутренняя
                 математика бэкенда и клиенту не отдаётся)
                 useBackgroundMusic.js — фоновая музыка + mute
  api/           client.js (реальный API + сессии), config.js (нормализует
                 GET /api/config/public в форму, удобную компонентам)
  lib/sound.js   синтезированные Web Audio звуки (хлопок шара, level-up, бустер,
                 птицы/капля на ThemeScreen) — без внешних файлов
  theme.css      CSS-переменные под красную/зелёную тему
```

## Статус по ТЗ

Обязательный минимум (раздел "Требования к решению" + сценарии 1-5) — реализован:
выбор темы (доп. экран) → ставка (4 фрагмента с сервера, история глобальная по всем
игрокам, доступ к правилам и с ThemeScreen, и с BetScreen, уведомление «Не хватает
бонусов») → crash-цикл (рост коэффициента, «Забрать» строго по `canCashout`, шар летит
дальше после cashout, стили коэффициента по уровням 0-3, мини-онбординг у кнопки
«Забрать» разово, «+X» очков со звуком на каждом уровне) → бустер (маркер на уровне,
резкое умножение, доп. очки, вспышка + звук) → результат (выигрыш/проигрыш, очки,
награда — отдельная от очков и баланса сущность, «могли бы забрать больше», seed для
provably-fair проверки, история, «Играть снова» с сохранением темы, автопереход 10 сек)
→ управление параметрами (`config.json` бэкенда + `/api/admin/config/reload`, без
перезапуска и без правки кода).

Не реализовано (все — заявленные в ТЗ как дополнительные, не входят в обязательный
минимум): живой рейтинг, турнирная таблица, апсейл-попап, полноценная админ-панель
(только конфиг-файл + один reload-эндпоинт), мгновенный повтор ставки, восстановление
раунда из localStorage после перезагрузки страницы.

## Особенности контракта, которые стоит держать в голове

- **Тема** — на бэке enum `RED`/`GREEN` (верхний регистр), в UI везде `'red'`/`'green'`
  (нижний) — конвертация только в `client.js`.
- **Фрагмент ставки** — клиент шлёт только `fragmentId` (0-3), пару `betAmount`/
  `boosterValue` возвращает сервер через `/api/config/public`; клиент физически не
  может подделать комбинацию.
- **`levelThresholds`** приходит в ответе на старт раунда и в публичном конфиге — это
  RAW-пороги (без бустера); `currentMultiplier`, который видит игрок, уже с бустером,
  если он сработал.
- **serverSeed/seedHash** — provably fair (п.2.3 ТЗ): `seedHash` виден сразу при старте
  (`round.seedHash`), `serverSeed` раскрывается в state, как только раунд не
  `IN_PROGRESS`. Показывается на экране результата.
