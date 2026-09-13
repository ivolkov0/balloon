# Raketka Backend — README для команды фронтенда

Документ описывает **как устроен и как работает бэкенд** игры «Воздушный Шар» (crash). Задача документа — дать полную картину: что есть в игре, как оно считается, какие ручки существуют, как читать состояния. Готовых рецептов вёрстки здесь нет — это справочник по серверной части.

---

## 1. Что это за игра

«Воздушный Шар» — браузерная crash-игра с турнирной механикой. Игрок:

1. Выбирает **тему** (красный шар — 12 уровней, зелёный — 9 уровней).
2. Выбирает **фрагмент пазла** — это пара `(ставка в бонусных баллах, значение бустера)`. Фрагментов ровно 4: `50/×1`, `150/×2`, `300/×3`, `600/×4`.
3. Нажимает «Начать» — с баланса списывается ставка, начинается раунд.
4. Наблюдает, как растёт коэффициент. На пути шара — уровни; при пересечении уровня начисляются **игровые очки** (отдельная от баланса сущность, идёт в рейтинг).
5. Где-то на одном из уровней зарыт **бустер**: если шар докатится до него до cashout — коэффициент умножается на значение бустера, а игрок получает бонусные очки.
6. В любой момент после первого уровня может нажать **«Забрать»** (cashout) — фиксирует текущий коэффициент, `выигрыш = ставка × коэффициент`, сумма идёт в баланс.
7. **Даже после cashout шар продолжает лететь** до точки краха. Игрок видит, «могли бы забрать больше».
8. Когда шар лопается — раунд закрывается, начисляются очки, результат уходит в историю.

Ключевая идея: клиент **никогда не решает исход**. Точка краха, позиция бустера и все случайности генерируются на сервере из серверного seed до старта полёта. Клиент только **отображает**.

---

## 2. Стек бэкенда

- **Spring Boot 4.1.1** (мажорная 4.x — API местами отличается от 3.x)
- **Java 25**
- **Maven**
- **PostgreSQL**, Hibernate `ddl-auto: update` (миграций нет)
- **Jackson 3** (гибрид: `JsonMapper` из `tools.jackson.*`, аннотации `@JsonProperty` из `com.fasterxml.jackson.annotation`)
- **springdoc-openapi 3.0.1** — Swagger на `/swagger-ui.html`, спека на `/v3/api-docs`
- **Spring Security** — кастомная session-аутентификация через заголовок `X-Session-Token`

Запуск (локально, если есть Java 25/Maven):
```bash
mvn spring-boot:run
# или
java -jar target/Raketka-0.0.1-SNAPSHOT.jar --CONFIG_PATH=./config.json
```

Дефолтный порт — `8080`. URL БД и учётка — в `application.yml`.

**Прод-деплой (весь стек — Postgres + backend + frontend — одной командой):** см.
`docker-compose.yml` в репозитории `BallonFrontend` — он собирает и этот репозиторий
как сиблинг-папку (`build: ../raketka`), Java/Maven на сервере не нужны, всё в Docker.
Локальная разработка без Java на хосте — см. `README-DEV.md` (сборка через
`maven:3.9-eclipse-temurin-25`, запуск через `eclipse-temurin:25-jre`).

---

## 3. Архитектура в двух словах

```
Клиент (vanilla JS)
   │
   │  X-Session-Token: <opaque>
   ▼
Spring Security  ──►  TokenAuthFilter  ──►  SessionService (in-memory map)
   │                                              │
   │  (если токен валиден — Long userId в Authentication)
   ▼
Controllers  ──►  Services  ──►  Repositories  ──►  PostgreSQL
   │
   └─► @Scheduled(fixedDelay=200)  ──►  RoundService.checkActiveRounds
                                            (крутит все IN_PROGRESS раунды)
```

- **Состояние сессий** — в оперативной памяти. Рестарт приложения = все токены мертвы. Для dev/TZ это ок.
- **Состояние игры** — в PostgreSQL. Раунды, юзеры, балансы, очки.
- **Активные раунды** — фоновый планировщик с пулом потоков **8** (было 4), тик каждые **200 мс**.
- **Все раунды изолированы по `userId`**. Один юзер не видит чужие раунды и не может делать действия над ними.

---

## 4. Аутентификация и сессии

### 4.1. Модель

- **Opaque-токен**, не JWT. Строка-случайность, живёт в `SessionService` (in-memory `ConcurrentHashMap<String, Long>`).
- Токен выдаётся при `POST /api/auth/guest`, `POST /api/auth/register`, `POST /api/auth/login`.
- Передаётся **только заголовком** `X-Session-Token`, не в cookie.
- **Каждая вкладка браузера = отдельная сессия.** Фронт хранит токен в `sessionStorage` (не `localStorage`). Открыл вторую вкладку — новый guest, новый userId, свой баланс, своя история.

### 4.2. Ручки

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| POST | `/api/auth/guest` | нет | Создать нового гостя. Тело пустое. |
| POST | `/api/auth/register` | нет | `{username, password}` → новый аккаунт. |
| POST | `/api/auth/login` | нет | `{username, password}` → токен. |
| POST | `/api/auth/logout` | да | Убить текущий токен. → `204` |
| GET | `/api/auth/me` | да | Текущий юзер. `token: null` в ответе. |

Все три первые ручки возвращают одинаковый JSON:

```json
{
  "userId": 42,
  "username": "guest-a82ac536",
  "balance": 100000,
  "points": 0,
  "token": "acf26fae56cdcac139f5e6ee57d2da8c..."
}
```

### 4.3. Что делает фронт при старте

1. Проверить `sessionStorage.raketka.token`.
2. Если пусто — `POST /api/auth/guest`, сохранить `token` и `user` в `sessionStorage`.
3. Дальше во всех запросах к `/api/**` подставлять `X-Session-Token`.
4. На `401` — токен мёртв (рестарт сервера). Очистить и повторить шаг 2.

### 4.4. Что не нужно

- Cookie, `credentials: 'include'`, `JSESSIONID` — не используются.
- CSRF-токен — CSRF отключён для `/api/**`.
- Обновление токена — его нет, при 401 просто пересоздаём guest.

---

## 5. Публичный конфиг игры

Фронт **не хардкодит** параметры игры. Всё, что нужно для UI, отдаётся через публичный эндпоинт:

### `GET /api/config/public` (без auth)

```json
{
  "gameName": "Воздушный Шар",
  "gameType": "crash_bonus",
  "startingBalance": 100000,
  "pointsPerLine": 10,
  "pointsCashoutBonus": 25,
  "pointsBoosterBonus": 50,
  "fragments": [
    { "id": 0, "betAmount": 50,  "boosterValue": 1 },
    { "id": 1, "betAmount": 150, "boosterValue": 2 },
    { "id": 2, "betAmount": 300, "boosterValue": 3 },
    { "id": 3, "betAmount": 600, "boosterValue": 4 }
  ],
  "themes": {
    "RED":   { "levelsTotal": 12, "levelThresholds": [1.10, 1.25, 1.45, ...] },
    "GREEN": { "levelsTotal": 9,  "levelThresholds": [1.10, 1.30, 1.60, ...] }
  }
}
```

Фронт использует это для:
- Рендера 4 карточек фрагментов (`id`, `betAmount`, `boosterValue`).
- Отрисовки шкалы уровней (сколько их, где пороги).
- Отображения правил/подсказок про очки.

Чего в ответе **нет** (и не должно быть на клиенте): `houseEdge`, `minCrashMultiplier`, `maxMultiplier`, `multiplierGrowthRate`, `lineProbabilities`, `fixedSeed`. Это внутренняя математика.

---

## 6. Математическая модель

Ниже — то, что реально считается на сервере. Фронт не должен это повторять, но должен понимать, чтобы правильно рисовать.

### 6.1. Рост коэффициента

```
current(t) = exp(growthRate * t)
```

где:
- `t` — секунды с момента `startedAt` раунда;
- `growthRate` — из конфига (`multiplierGrowthRate`, сейчас `0.15`).

Функция снимается в момент каждого poll-запроса на сервере. Фронт при отображении может интерполировать между ответами, но **истина — на сервере**.

### 6.2. Точка краха (crash multiplier)

Считается **один раз при старте раунда** из серверного seed:

```
1. serverSeed = 32 случайных байта (или fixedSeed из конфига для отладки)
2. seedHash = SHA-256(serverSeed)  ← отдаётся клиенту сразу
3. RNG = SHA1PRNG с seed = HMAC-SHA256(serverSeed, "crash")
4. r = RNG.nextDouble()
5. rawCrash = (1 - houseEdge) / (1 - r)
6. crashMultiplier = clamp(rawCrash, minCrashMultiplier, maxMultiplier)
```

`crashMultiplier` фиксируется в БД в момент старта и не меняется. Клиент **не влияет** ни на seed, ни на результат.

**Provably fair (упрощённое):** до начала раунда клиент видит `seedHash`. После краха в `state` появляется `serverSeed`. Игрок может проверить: `SHA256(serverSeed) == seedHash`. Этого достаточно для ТЗ.

### 6.3. Позиция бустера

Только если `boosterValue > 1` (то есть фрагмент выбран с бустером). Считается тоже из seed, но с другим доменным разделителем:

```
RNG2 = SHA1PRNG с seed = HMAC-SHA256(serverSeed, "booster-line")
lineProbabilities = themeConfig.lineProbabilities  (массив длины levelsTotal)
позиция = взвешенный случайный выбор по lineProbabilities → индекс 0..levelsTotal-1
```

Позиция `boosterLine` тоже фиксируется при старте. Если `boosterValue == 1` — `boosterLine = -1`, бустера нет.

### 6.4. Прогресс по уровням

**Пороги (`levelThresholds`)** — массив множителей, по одному на уровень. Уровень `i` считается пройденным, когда **raw** (без бустера) коэффициент `>= levelThresholds[i]`.

```
levelsPassed = count(levelThresholds[i] <= rawCurrent)
```

Пример для GREEN `[1.10, 1.30, 1.60, 2.00, 2.50, 3.10, 3.90, 4.90, 6.20]`:
- raw = 1.05 → 0 уровней
- raw = 1.35 → 2 уровня
- raw = 2.10 → 4 уровня

Пороги **строго возрастают** и **не зависят** от бустера. Бустер даёт только множитель к выигрышу и очки за активацию, но не влияет на то, сколько уровней пройдено.

### 6.5. Бустер

Механика:

1. При старте: `boosterLine` известен (или `-1`, если бустера нет).
2. Во время полёта: когда **raw** коэффициент пересекает `levelThresholds[boosterLine]`, бустер **срабатывает один раз**.
3. С этого момента все дальнейшие значения `currentMultiplier` умножаются на `boosterValue`.

То есть:
```
currentMultiplier = raw * (boosterTriggered ? boosterValue : 1)
```

Флаг `boosterTriggered` живёт в БД и **не сбрасывается**. Как только он true — он true навсегда для этого раунда.

**После cashout бустер не активируется** — если игрок забрал до пересечения уровня бустера, бустер не считается сработавшим для выигрыша (но `boosterTriggered` в state может остаться false до конца раунда).

### 6.6. Cashout и выигрыш

Cashout можно **только если `rawCurrent >= levelThresholds[0]`** (первый уровень пройден).

```
cashoutMultiplier = raw * (boosterTriggered ? boosterValue : 1)
payout = round(betAmount * cashoutMultiplier)
balance += payout
```

После cashout раунд переходит в статус `CASHED_OUT`, но **шар продолжает лететь**. `finishedAt` остаётся `null` до момента краха. В этом состоянии `currentMultiplier` продолжает расти (с учётом бустера), а `payout` уже зафиксирован в балансе.

### 6.7. Крах

Когда `rawCurrent >= crashMultiplier`:

```
status = CRASHED
finishedAt = now
crashMultiplier = crashMultiplier  (тот, что был из seed)
```

Неважно, был ли cashout. Если был — игрок зафиксировал выигрыш, но мог бы забрать больше. Если нет — потерял ставку.

### 6.8. Очки (points)

Начисляются **только при крахе** (в момент `status = CRASHED`):

```
points = pointsPerLine * levelsPassed
       + (cashoutMade ? pointsCashoutBonus : 0)
       + (boosterTriggered ? pointsBoosterBonus : 0)
```

Куда идут:
- `User.points` — копятся навсегда, уменьшаться не могут.
- Отдельно от `balance` (баланс можно проиграть в следующей ставке).
- Рейтинг (если будет) — по `points`.

`levelsPassed` в момент краха считается от `crashMultiplier` (итогового множителя краха), не от `cashoutMultiplier`.

---

## 7. Состояние раунда — стейт-машина

```
           POST /api/round/start
                    │
                    ▼
              IN_PROGRESS ──────── cashout доступен после первого уровня
                    │            currentMultiplier = raw × (booster ? N : 1)
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      │ cashout     │             │ шар сам долетел до crashMultiplier
      │             │             │
      ▼             │             ▼
   CASHED_OUT       │          CRASHED ──► finishedAt, pointsEarned
   (шар летит)      │
      │             │
      │ шар долетел до crashMultiplier
      │
      ▼
   CRASHED ──► finishedAt, pointsEarned
```

**Статусы:**
- `IN_PROGRESS` — шар летит, игрок может забрать (если пройден 1-й уровень).
- `CASHED_OUT` — игрок забрал, `cashoutMultiplier` зафиксирован, `balance` увеличен, шар продолжает лететь. `finishedAt = null`.
- `CRASHED` — терминальное состояние, `finishedAt != null`, очки начислены.

**Кто переводит статусы:**
- `startRound` → `IN_PROGRESS`.
- `cashoutAttempt` → `CASHED_OUT`.
- Планировщик (`checkOneRound`, каждые 200 мс) → `CRASHED` когда пришло время, независимо от того, был cashout или нет.
- Планировщик также может «догнать» state при polling, если шар уже должен был лопнуть (см. п. 8).

---

## 8. Игровой цикл — что происходит

### 8.1. Старт

```
POST /api/round/start
Header: X-Session-Token
Body: { "theme": "GREEN", "fragmentId": 1 }
```

Сервер:
1. Смотрит фрагмент `1` → `betAmount = 150`, `boosterValue = 2`.
2. Проверяет баланс юзера.
3. Списывает `150`.
4. Генерирует `serverSeed`, `seedHash`, `crashMultiplier`, `boosterLine`.
5. Сохраняет `Round` со снапшотом конфига.
6. Возвращает `StartRoundResponse`.

Ответ:
```json
{
  "roundId": 7,
  "seedHash": "76f83ebc124024273077a9673c12192cc437ec1038c39d15f88980094b48acaf",
  "startedAt": "2026-09-13T08:43:12.787040400Z",
  "theme": "GREEN",
  "levelsTotal": 9,
  "betAmount": 150,
  "boosterValue": 2,
  "levelThresholds": [1.10, 1.30, 1.60, 2.00, 2.50, 3.10, 3.90, 4.90, 6.20]
}
```

Фронт после этого переходит на игровой экран и **поллит state** каждые ~200–500 мс.

### 8.2. Поллинг состояния

```
GET /api/round/{id}/state
Header: X-Session-Token
```

Ответ — `RoundStateResponse`:
```json
{
  "status": "IN_PROGRESS",
  "currentMultiplier": 1.4523,
  "levelsPassed": 1,
  "boosterTriggered": false,
  "cashoutMultiplier": null,
  "crashMultiplier": null,
  "pointsEarned": 0,
  "missedMultiplier": null,
  "serverSeed": null,
  "canCashout": true
}
```

Поля:

| Поле | Когда заполнено | Что значит |
|---|---|---|
| `status` | всегда | `IN_PROGRESS` / `CASHED_OUT` / `CRASHED` |
| `currentMultiplier` | всегда | Текущий множитель (raw × booster, если сработал) |
| `levelsPassed` | всегда | Сколько порогов пройдено |
| `boosterTriggered` | всегда | Сработал ли бустер |
| `cashoutMultiplier` | CASHED_OUT, CRASHED | Зафиксированный множитель |
| `crashMultiplier` | CRASHED | Итоговый множитель краха |
| `pointsEarned` | CRASHED | Очки за раунд (до краха = 0) |
| `missedMultiplier` | CRASHED + был cashout | «Могли бы забрать больше» = crashMultiplier |
| `serverSeed` | CASHED_OUT, CRASHED | Раскрывается после окончания полёта |
| `canCashout` | всегда | `true` только если `IN_PROGRESS` и пройден 1-й уровень |

**Важно:** даже если `status = IN_PROGRESS`, но `rawCurrent` уже превысил `crashMultiplier` (а планировщик ещё не успел записать крах), сервер **подменяет** ответ на финальный вид: `status = CRASHED`, `currentMultiplier = crashMultiplier`. Фронт никогда не увидит растущий кэф у уже лопнувшего шара. Это защита от «окна краха».

**Что значит `canCashout = false`:**
- Если `IN_PROGRESS` и `canCashout = false` — кнопка «Забрать» должна быть **видима, но неактивна**. Первый уровень ещё не пройден.
- Если `CASHED_OUT` или `CRASHED` — кнопка неактивна (раунд решён).

### 8.3. Cashout

```
POST /api/round/{id}/cashout
Header: X-Session-Token
Body: пусто
```

Возможные ответы:
- `200 CASHED_OUT` — выигрыш зачислен, шар летит.
- `200 CRASHED` — не успел, шар лопнул до нажатия (или на момент нажатия крах уже наступил).
- `400 BAD_REQUEST "cannot cashout before first level"` — рано.
- `404 NOT_FOUND` — раунд чужой или не существует.
- `409 CONFLICT` — оптимистичный конфликт (одновременные запросы).

После cashout фронт продолжает поллить state, пока не получит `CRASHED`.

### 8.4. Результат раунда

Когда приходит `CRASHED`, фронт читает:
- `cashoutMultiplier` — если был выигрыш, это зафиксированное значение.
- `crashMultiplier` — где реально лопнул.
- `pointsEarned` — сколько очков заработано.
- `missedMultiplier` — «могли бы забрать больше» (только если был cashout).
- `serverSeed` — для проверки честности.

Фронт решает по `cashoutMultiplier != null`: WIN или LOSS.

---

## 9. API — полный справочник

### 9.1. Auth

Уже описано в разделе 4.

### 9.2. Config

```
GET /api/config/public          (без auth)
```

Отдаёт фрагменты, темы, пороги, базовые параметры очков.

### 9.3. Профиль

```
GET /api/user                   (auth)
```

```json
{
  "userId": 42,
  "username": "guest-a82ac536",
  "balance": 100111,
  "points": 105
}
```

`balance` и `points` — независимые сущности. Баланс тратится на ставки, очки копятся.

### 9.4. Раунды

```
POST /api/round/start           (auth)
GET  /api/round/{id}/state      (auth)
POST /api/round/{id}/cashout    (auth)
```

Все — только для владельца раунда. Чужой `id` → `404`.

### 9.5. История

```
GET /api/history?limit=20&scope=global     (auth)
GET /api/history?limit=20&scope=me         (auth)
```

По умолчанию `scope=global` — **все раунды всех юзеров** (по ТЗ 1.2). `scope=me` — только свои.

Ответ:
```json
[
  {
    "username": "guest-a82ac536",
    "theme": "RED",
    "betAmount": 1000,
    "cashoutMultiplier": 1.2113,
    "crashMultiplier": 2.1465,
    "result": "WIN",
    "pointsEarned": 25
  },
  {
    "username": "guest-cae16ad5",
    "theme": "GREEN",
    "betAmount": 150,
    "cashoutMultiplier": null,
    "crashMultiplier": 3.33,
    "result": "LOSS",
    "pointsEarned": 80
  }
]
```

`limit` — 1..100, по умолчанию 20. Пагинации по offset нет.

### 9.6. Admin

```
POST /api/admin/config/reload   (auth)
```

Перечитывает `config.json` без рестарта. Если конфиг невалиден — старый остаётся, возвращается `400 CONFIG_INVALID`.

---

## 10. Ошибки — единый формат

Все ошибки кроме `RoundAlreadyCrashedException` возвращают:

```json
{ "code": "BAD_REQUEST", "message": "..." }
```

| Код | HTTP | Когда |
|---|---|---|
| `UNAUTHORIZED` | 401 | Нет/протух токен. |
| `BAD_REQUEST` | 400 | Невалидный ввод, недостаточно баланса до первого уровня. |
| `NOT_ENOUGH_BALANCE` | 400 | Ставка > баланса. |
| `NOT_FOUND` | 404 | Нет юзера/раунда, или раунд чужой. |
| `CONFLICT` | 409 | Optimistic lock (редко, при параллельных cashout). |
| `CONFIG_INVALID` | 400 | `/api/admin/config/reload` с плохим конфигом. |

Фронт должен на `401` **очищать `sessionStorage`** и перезапрашивать guest-токен.

---

## 11. Модель данных (для понимания, не для запросов)

### 11.1. User

| Поле | Тип | Описание |
|---|---|---|
| `id` | Long | PK |
| `username` | String | unique, not null |
| `passwordHash` | String | nullable (guest без пароля) |
| `balance` | int | Бонусные баллы (ставки) |
| `points` | int | Игровые очки (рейтинг) |
| `version` | Long | `@Version` — оптимистичная блокировка |

### 11.2. Round

| Поле | Тип | Описание |
|---|---|---|
| `id` | Long | PK |
| `userId` | Long | not null, владелец |
| `theme` | enum | `RED` / `GREEN` |
| `fragmentId` | int | 0..3, какой фрагмент выбран |
| `betAmount` | int | Ставка |
| `boosterValue` | int | 1..4, из фрагмента |
| `boosterLine` | int | Позиция бустера (`-1` если нет) |
| `boosterTriggered` | boolean | Сработал ли |
| `crashMultiplier` | double | Точка краха (из seed) |
| `cashoutMultiplier` | Double | Зафиксированный кэшаут (nullable) |
| `status` | enum | `IN_PROGRESS` / `CASHED_OUT` / `CRASHED` |
| `pointsEarned` | int | Заполняется при крахе |
| `startedAt` | Instant | Момент старта |
| `finishedAt` | Instant | Момент краха (nullable) |
| `serverSeed` | String | Раскрывается после краха |
| `seedHash` | String | Показывается сразу |
| `configSnapshotJson` | text | Снапшот конфига на момент раунда |
| `version` | Long | `@Version` |

**Снапшот конфига** — принципиален. Если админ меняет `pointsPerLine` в `config.json`, уже идущие раунды **не пересчитываются** — они используют тот конфиг, что был при старте. Клиент это никак не видит, но это влияет на очки в раундах, начатых до и после reload.

---

## 12. Планировщик и гонки

- `@Scheduled(fixedDelay = 200)` — каждые 200 мс сервер берёт **все** раунды в статусе `IN_PROGRESS` или `CASHED_OUT` и проверяет, не пора ли крахнуть.
- Пул потоков — **8** (было 4). Хватает на несколько параллельных юзеров.
- Внутри каждой итерации — `REQUIRES_NEW` транзакция. Ошибка в одном раунде не рушит другие.
- `@Version` на `Round` — если клиент жмёт cashout, пока планировщик пишет крах, один из них получит `OptimisticLockingFailureException`. Cashout делает **один retry**.
- **Окно краха**: между «пора крахнуть» и «записано в БД» проходит ≤200 мс. В этом окне `GET state` **сам** отдаёт финальный вид (`status = CRASHED`, `currentMultiplier = crashMultiplier`), не дожидаясь планировщика. Фронт не должен видеть растущий кэф у мёртвого шара.

---

## 13. Что ожидается от фронта (высокоуровнево)

Не инструкции, а ожидания:

1. **Token bootstrap** при загрузке страницы. `sessionStorage` для токена, авто-guest при отсутствии.
2. **Заголовок `X-Session-Token`** во всех `/api/**` запросах.
3. **Polling state** во время полёта с частотой ~200–500 мс. Не чаще 100 мс — сервер не отдаёт точнее.
4. **Отображение кэшаута** только когда `canCashout = true`.
5. **Переход на экран результата** при `status = CRASHED`. Учитывать `missedMultiplier` для сообщения «могли бы забрать больше».
6. **Переключение темы** — просто менять `theme` в следующем `POST /start`.
7. **Перерисовка шкалы уровней** — `levelThresholds` приходит в `StartRoundResponse`, `levelsPassed` в каждом `state`.
8. **История** — отдельный запрос к `/api/history` при открытии экрана.
9. **Публичный конфиг** — один раз при загрузке приложения, для рендера карточек фрагментов.

---

## 14. Что изменилось относительно прошлой версии бэкенда

Это раздел для той ИИ, которая, возможно, уже видела более старый бэк. Ниже — сводка всех изменений.

### 14.1. Multi-user и аутентификация (этап 1)

**Было:**
- Один сид-юзер `id=1`, `InitConfig` создавал его при старте.
- Все ручки работали от `userRepository.findById(1L).orElse(findFirst())`.
- `Round` **не был** связан с юзером — история была глобальной.
- Аутентификации не было вообще.

**Стало:**
- `User` получил `username`, `passwordHash`, `@Version`.
- **Session-auth через `X-Session-Token`**, opaque, in-memory.
- Каждая вкладка = отдельный юзер. Авто-guest через `POST /api/auth/guest`.
- `Round.userId` — обязательное поле. Все операции скоупятся по `userId`. Чужой раунд → `404`.
- `InitConfig` удалён, сид-юзер не создаётся.
- `RoundService.startRound/getState/cashout` принимают `Long userId` первым аргументом.
- `Authentication.getPrincipal() == Long userId`.

### 14.2. Планировщик

**Было:**
- Один `volatile Long currentRoundId`, планировщик крутил только его.
- `@PostConstruct recoverActiveRound()` — при старте подхватывал один IN_PROGRESS.
- Пул — 4 потока.

**Стало:**
- Планировщик итерирует **все** раунды в `IN_PROGRESS` / `CASHED_OUT` через `findByStatus`.
- `recoverActiveRound` удалён — не нужен, и так все видит.
- Пул — 8 потоков.

### 14.3. Окно краха

**Было:**
- `GET /api/round/{id}/state` возвращал растущий `currentMultiplier` даже если `crashMultiplier` уже пройден. Между «шар лопнул» и «планировщик записал» показывался растущий кэф. Баг.

**Стало:**
- `getState` сверяет `rawCurrent >= crashMultiplier` и **сам** подменяет ответ на финальный вид. Растущий кэф у мёртвого шара не показывается никогда.

### 14.4. Конфиг

**Было:**
```json
{
  "minCrashMultiplier": 1.01,
  "maxMultiplier": 100.0,
  "multiplierGrowthRate": 0.15,
  "houseEdge": 0.03,
  "pollIntervalMs": 450,
  "pointsPerLine": 10,
  "pointsCashoutBonus": 25,
  "pointsBoosterBonus": 50,
  "startingBalance": 100000,
  "themes": {
    "RED":   { "lineProbabilities": [..4], "boosterMultipliers": [..4], "levelsTotal": 4 },
    "GREEN": { "lineProbabilities": [..4], "boosterMultipliers": [..4], "levelsTotal": 4 }
  },
  "rewardWeights": { "PUZZLE_A": 0.5, "PUZZLE_B": 0.3, "PUZZLE_C": 0.2 }
}
```

**Стало:**
```json
{
  "gameId": "vozdushny-shar",
  "gameName": "Воздушный Шар",
  "gameType": "crash_bonus",
  "isActive": true,
  "minCrashMultiplier": 1.01,
  "maxMultiplier": 100.0,
  "multiplierGrowthRate": 0.15,
  "houseEdge": 0.03,
  "startingBalance": 100000,
  "fixedSeed": null,
  "pointsPerLine": 10,
  "pointsCashoutBonus": 25,
  "pointsBoosterBonus": 50,
  "fragments": [
    { "id": 0, "betAmount": 50,  "boosterValue": 1 },
    { "id": 1, "betAmount": 150, "boosterValue": 2 },
    { "id": 2, "betAmount": 300, "boosterValue": 3 },
    { "id": 3, "betAmount": 600, "boosterValue": 4 }
  ],
  "themes": {
    "RED":   { "levelsTotal": 12, "lineProbabilities": [..12], "levelThresholds": [..12] },
    "GREEN": { "levelsTotal": 9,  "lineProbabilities": [..9],  "levelThresholds": [..9] }
  }
}
```

Что поменялось:
- `levelsTotal` — **9/12**, было 4/4.
- `boosterMultipliers` удалено. Значение бустера теперь **не в конфиге темы**, а в `fragments`.
- `lineProbabilities` — теперь длина `levelsTotal`, а не фиксированные 4.
- `levelThresholds` — новое поле: пороги уровней (множители).
- `rewardWeights` удалено — награды-пазла больше нет.
- `pollIntervalMs` удалено — не использовалось.
- Добавлены `gameId`, `gameName`, `gameType`, `isActive`.
- Добавлено `fragments` — 4 фрагмента с парой `(betAmount, boosterValue)`.

### 14.5. Механика бустера

**Было:**
- `boosterMultiplier` (1..4) приходил от клиента в `StartRoundRequest`.
- `ThemeConfig.boosterMultipliers` играл роль порогов уровней, а не значений бустера.
- В `cashoutAttempt` бустер применялся **дважды**: сначала в `current` (через `applyBoosterAndFlag`), потом ещё раз в payout (`* round.getBoosterMultiplier()`). Баг.

**Стало:**
- Клиент присылает **только** `fragmentId`. Пара `(betAmount, boosterValue)` приходит из конфига сервера. Клиент не может подделать комбинацию.
- Бустер — это `boosterValue` (из фрагмента), позиция — `boosterLine` (из seed по `lineProbabilities`).
- Применяется **один раз** в момент, когда **raw** коэффициент пересекает `levelThresholds[boosterLine]`.
- `boosterTriggered` — булево поле в БД, никогда не сбрасывается.
- Двойное умножение убрано.

### 14.6. Уровни

**Было:**
- `levelsTotal = 4`, пороги = `boosterMultipliers`.
- `computeLevelsPassed` сравнивал с `boosterMultipliers`.

**Стало:**
- `levelsTotal = 9/12`, пороги = `levelThresholds`.
- `computeLevelsPassed(rawCurrent, ...)` — считает пороги по **raw**, без бустера.
- `levelsPassed` в ответе — всегда по raw.

### 14.7. Cashout и крах

**Было:**
- `cashoutAttempt` сразу ставил `finishedAt`, раунд завершался.
- Кнопка «Забрать» активна с первой секунды.
- `markCrashed` вызывался из cashoutAttempt только при «крэшнулся до того, как игрок нажал».
- `markCrashed` бросал `RoundAlreadyCrashedException` **после** сохранения → `@Transactional` откатывал крах. Окно несогласованности до следующего тика планировщика.

**Стало:**
- Кнопка «Забрать» активна **только после первого уровня**. Сервер проверяет `rawCurrent >= levelThresholds[0]`, иначе `400`.
- Cashout → `CASHED_OUT`. **`finishedAt` не ставится**. Шар летит.
- Планировщик при достижении краха переводит раунд в `CRASHED` из любого нетерминального состояния (`IN_PROGRESS` или `CASHED_OUT`).
- `pointsEarned` начисляется **один раз при крахе**, а не при cashout.
- Баланс увеличивается **один раз при cashout**, а не при крахе.
- Rollback при крахе устранён: `markCrashed` больше не бросает исключений, `cashoutAttempt` возвращает ответ в обоих сценариях.

### 14.8. Очки (points)

**Было:**
- `computePointsEarned(levelsPassed, cashoutMultiplier, boosterTriggered, config)`.
- Начисление и при cashout, и при крахе.

**Стало:**
- `computePointsEarned(levelsPassed, cashoutMade, boosterTriggered, config)`.
- Только при крахе (`status = CRASHED`).
- `pointsPerLine * levelsPassed + cashoutBonus + boosterBonus`.

### 14.9. Награда (Reward) — удалена

**Было:**
- Enum `Reward` с `PUZZLE_A..D`.
- Поле `Round.reward`.
- `pickReward()` в `CrashMathService`.
- `rewardWeights` в конфиге.
- Нигде не сохранялась у юзера.

**Стало:**
- Enum и поле удалены полностью.
- Награда = **игровые очки (points)**. RPG-прогрессия: копятся в `User.points`, растут за уровни, cashout, бустер.
- Поле `reward` убрано из `RoundStateResponse`.

### 14.10. DTO-контракты

| DTO | Было | Стало |
|---|---|---|
| `StartRoundRequest` | `{theme, betAmount, boosterMultiplier}` | `{theme, fragmentId}` |
| `StartRoundResponse` | `{roundId, seedHash, startedAt, theme, levelsTotal, betAmount, boosterMultiplier}` | `{roundId, seedHash, startedAt, theme, levelsTotal, betAmount, boosterValue, levelThresholds}` |
| `RoundStateResponse` | `{..., reward, ...}` | `{..., canCashout}` (reward удалён, canCashout добавлен) |
| `HistoryItemResponse` | `{theme, betAmount, ...}` | `{username, theme, betAmount, ...}` (username добавлен) |
| `UserResponse` | `{balance, points}` | `{userId, username, balance, points}` |

### 14.11. История

**Было:**
- `GET /api/history` — глобальная, но с багом `Top20` в имени метода (Spring Data читал `TopN` как фиксированный top-20, `limit` не работал).
- Фильтра по юзеру не было.

**Стало:**
- `GET /api/history?scope=global` — все раунды всех юзеров (по ТЗ). По умолчанию.
- `GET /api/history?scope=me` — только свои.
- `limit` работает (1..100).
- В каждом элементе — `username`, чтобы отличать игроков.

### 14.12. Прочее

- `WebConfig` (пустой после удаления CORS) — удалён.
- `RaketkaApplicationTests` — `@Disabled` (требует PostgreSQL).
- `pom.xml` — пустые метаданные убраны.
- `application.yml` — пул планировщика 4 → 8.
- `AdminController.config/reload` — доступен любому аутентифицированному (без роли ADMIN, для прототипа).
- Swagger — настроен `@SecurityScheme` для `X-Session-Token`, кнопка Authorize на `/swagger-ui.html`.

---

## 15. Что НЕ реализовано (для ожиданий)

- **Живой рейтинг** (`/api/rating/live`) — не реализован. Очки видны только в `/api/user` и `/api/auth/me`.
- **Турнирная таблица** (`/api/tournament/table`) — не реализована.
- **Апсейл-попап** («Закрепи успех») — не реализован.
- **Провably fair verify endpoint** (`/api/round/{id}/verify`) — нет отдельного эндпоинта, но `seedHash`/`serverSeed` есть в state, верификация руками.
- **Полноценная админка** — только `POST /api/admin/config/reload` + ручная правка `config.json`.
- **Сохранение состояния между сессиями** — токены в памяти, рестарт = logout.
- **WebSocket / SSE** — не используются, только polling.

Эти пункты помечены в ТЗ как «дополнительные». Базовая игровая механика работает без них.

---

## 16. Чек-лист интеграции (для отладки)

- [ ] При загрузке страницы — если в `sessionStorage` нет токена, вызвать `POST /api/auth/guest`.
- [ ] Все запросы к `/api/**` (кроме `/api/auth/guest|register|login` и `/api/config/public`) — с заголовком `X-Session-Token`.
- [ ] При `401` — сбросить токен и пересоздать guest, повторить запрос один раз.
- [ ] Один раз при старте — `GET /api/config/public`, запомнить `fragments` и `themes`.
- [ ] При выборе фрагмента — помнить `id`, при старте отправлять `{theme, fragmentId}`.
- [ ] Во время полёта — поллить `GET /api/round/{id}/state` каждые 200–500 мс.
- [ ] Кнопку «Забрать» включать только при `canCashout == true`.
- [ ] На `CRASHED` — остановить polling, показать экран результата.
- [ ] В экране результата — если `missedMultiplier != null`, показать «могли бы забрать X».
- [ ] После результата — `GET /api/history` для обновления ленты.
- [ ] В конце сессии (закрытии вкладки) — `sessionStorage` очищается автоматически, следующий запуск = новый гость.

Если что-то из этого не работает — сначала проверить `curl`-ом, потом искать в фронте.
