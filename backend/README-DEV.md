# Локальный запуск (эта машина)

На машине нет Java 25/Maven на PATH (только старый Java 8), поэтому всё гоняем в Docker.

```bash
docker compose up -d --build
```

- Бэкенд: http://localhost:8080/api/...
- Postgres: localhost:5432 (`app`/`app`/`vozshar`)
- Swagger UI: http://localhost:8080/swagger-ui.html (кнопка Authorize — вставить токен из `/api/auth/guest`)

Проверить, что поднялось:
```bash
curl -X POST http://localhost:8080/api/auth/guest -H "Content-Type: application/json"
```

Логи: `docker compose logs -f backend`
Остановить: `docker compose down` (данные Postgres остаются в volume `raketka-pg-data`;
`docker compose down -v` — стереть вместе с БД, нужно после смены структуры `Round`/`User`).

После правок в `src/**` или `config.json` — пересобрать: `docker compose up -d --build backend`.
Только `config.json` без изменения кода — быстрее через `/api/admin/config/reload`
(см. Сценарий 5 в ТЗ), без пересборки контейнера.

Фронтенд (репозиторий `BallonFrontend`) проксирует `/api` на `localhost:8080` через
Vite dev-server (см. там `vite.config.js`) — CORS на бэкенде не настроен, без прокси
браузер режет запросы с :5173 на :8080.

## ⚠️ 2026-09-13: коммит `vers01`/"Update print statement..." из origin не собирался

`git pull` принёс полностью переписанный README (описывает целевой контракт: 9/12
уровней, `fragmentId` вместо `betAmount+boosterMultiplier`, полёт после cashout,
`/api/config/public`, `canCashout`, глобальная история) — но САМ КОД не был обновлён
под это описание: `Reward.java` удалён, а `Round`/`RoundService`/`CrashMathService` его
всё ещё импортировали → `mvn compile` падал. DTO/`config.json`/контроллеры остались в
старой форме (`levelsTotal:4`, `boosterMultiplier` и т.п.), т.е. код и README расходились
полностью. Похоже, README запушили раньше реализации.

Я (сессия с ИИ) реализовал код по этому README и добавил недостающие куски —
теперь фронт (`BallonFrontend`) собран именно под этот контракт. Если бэкендер
запушит свою реализацию поверх — вероятен конфликт, сверяйтесь с этим списком:

- **`domain/Reward.java` восстановлен** (в README он объявлен удалённым — "награда =
  очки"). Я вернул его: ТЗ (п.1.5) и критерии оценки явно требуют награду как
  **отдельную** от баланса и очков сущность ("Бонусные баллы, игровые очки и награды
  имеют разные понятные роли" — Раздел 2 критериев). Начисляется в `finalizeCrash`
  при **любом** исходе (не только при проигрыше, как было в самой первой версии
  бэка) — раньше `reward` при выигрыше вообще не выставлялся, это отдельный баг,
  найденный и исправленный в этой же сессии.
- **`GameConfig`/`config.json`** — новая форма: `fragments[]` (id/betAmount/boosterValue),
  `themes.{RED,GREEN}.levelThresholds` (9/12 порогов, не 4), `lineProbabilities` той же
  длины. `houseEdge`/`minCrashMultiplier`/`maxMultiplier`/`multiplierGrowthRate`/
  `fixedSeed` остаются приватными (не отдаются в `/api/config/public`).
- **`ConfigController` + `PublicConfigResponse`** реализованы (были пустыми файлами-
  заглушками, 0 байт).
- **`RoundService`** переписан под README: `startRound` принимает `fragmentId` (не
  `betAmount`+`boosterMultiplier` от клиента — иначе клиент мог бы подделать пару);
  `cashoutAttempt` больше не ставит `finishedAt` — раунд уходит в `CASHED_OUT`, шар
  летит дальше; `checkActiveRounds` крутит и `IN_PROGRESS`, и `CASHED_OUT`; краху
  выделена одна точка входа `finalizeCrash` (без `RoundAlreadyCrashedException` —
  файл удалён, слишком): очки и награда начисляются один раз, только там.
- **Реальный баг, который я нашёл и исправил при тестировании (важно!):**
  `crashMultiplier` — это RAW-точка (сравнение `rawCurrent >= crashMultiplier` не
  учитывает бустер), но `currentMultiplier`, который видит игрок всё время полёта,
  — уже С бустером, если он сработал. Если отдавать наружу (state/history) чистый
  raw `crashMultiplier`, коэффициент в момент краха визуально "прыгает назад"
  (например, был ×7.78, стал ×4.09) — та же самая точка, просто в другом
  пространстве. Единая точка правды — `Round.getDisplayCrashMultiplier()`
  (raw × boosterValue, если триггернулся) — используется и в `RoundStateResponse`
  (`currentMultiplier`/`crashMultiplier`-поле/`missedMultiplier`), и в
  `HistoryController` (там раньше был отдельный расчёт, ушедший в разлад с state).
- **`ConfigService.validate()`** обновлён под новую форму (`levelThresholds` строго
  возрастают и совпадают по длине с `levelsTotal`/`lineProbabilities`, `fragments` не
  пустые).
- **`OpenApiConfig`** реализован (был пустым) — `X-Session-Token` как security scheme,
  на `/swagger-ui.html` появляется кнопка Authorize.
- `application.yml`: пул планировщика 4→8, как в README (п.2).
- Данные БД пересозданы с нуля (`docker compose down -v`) — старые тестовые раунды
  были в форме прежней схемы (`booster_multiplier` вместо `booster_value`, без
  `username`/`fragment_id`) и `ddl-auto: update` не умеет такие миграции.

Если бэкендер уже пишет свою версию этого же кода — сравните перед мержем, в первую
очередь пункты про Reward и про `getDisplayCrashMultiplier()` (легко упустить, ловится
только тестом со сработавшим бустером).

## Коллекция пазла (добавлено после аудита ТЗ, отдельная сессия)

Раньше `reward` (PUZZLE_A-D) был вспышкой на экране результата и никуда не сохранялся —
"собираем пазл" по факту не работало, хотя ТЗ 1.5 прямо описывает именно накопительную
механику ("дальнейшее использование награды"). Добавлено:

- `User.puzzleA/B/C/D` (int, копится навсегда) + `User.getSetsCompleted()` = min по
  всем четырём — сколько полных комплектов набрано. Не обнуляется: дубликаты идут в
  счёт следующего комплекта.
- `GameConfig.pointsSetCompleteBonus` (в `config.json`, дефолт 200) — ещё один
  admin-настраиваемый параметр начислений, как `pointsPerLine`/`pointsCashoutBonus`.
- `RoundService.finalizeCrash` — при каждом крахе инкрементирует нужный счётчик,
  сравнивает `setsCompleted` до/после; если выросло — бонус попадает в
  `round.pointsEarned` (не отдельной строкой) и ставится `Round.setCompleted=true`
  (только на этот конкретный раунд, не perscapisce-флаг на будущее).
- `GET /api/user` теперь отдаёт `puzzlePieces: {"PUZZLE_A": n, ...}` и `setsCompleted`.
- `RoundStateResponse.setCompleted` — фронт показывает баннер/конфетти именно на
  раунде, где комплект собрался.
