// Реальные вызовы бэкенда (Spring Boot, репозиторий NikitSik/raketka).
// Контракт см. README.md в репозитории бэкенда (разделы 4-9).
//
// Важные особенности реального бэка:
// - Авторизация через заголовок X-Session-Token (не cookie, не Bearer).
//   Токен выдаётся POST /api/auth/guest|register|login и живёт только в
//   памяти бэкенда — переживает столько же, сколько сам процесс Spring Boot.
// - Токен хранится в sessionStorage (не localStorage) — каждая вкладка
//   браузера — отдельная сессия/гость (см. README п.4.1).
// - Тема на бэке — enum Theme { RED, GREEN } (верхний регистр), у нас в UI
//   темы 'green'/'red' (нижний регистр) — конвертация ниже.
// - GET /api/config/public не требует auth и отдаёт всё, что нужно для
//   рендера ДО старта раунда (фрагменты ставок, уровни и их пороги) — без
//   внутренней математики (houseEdge, growthRate и т.п., см. README п.5).
// - Раунд НЕ завершается в момент cashout — статус становится CASHED_OUT,
//   шар продолжает лететь до настоящего краха (см. README п.6.6/8.1).
// - POST /round/{id}/cashout до первого уровня отдаёт 400 (canCashout=false
//   должно было заблокировать кнопку раньше — сюда почти никогда не дойдёт).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'raketka_session_token';

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage недоступен (приватный режим и т.п.) — сессия просто не переживёт эту загрузку
  }
}

async function request(path, options = {}, { allowRetry = true } = {}) {
  const token = getToken();
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Session-Token': token } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && allowRetry && path !== '/auth/guest') {
    // Токен протух (бэк перезапустился и потерял in-memory сессии) — тихо
    // логинимся заново гостем и повторяем запрос один раз.
    await authGuest();
    return request(path, options, { allowRetry: false });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed: ${res.status}`);
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- тема: UI использует lowercase, бэк — enum в верхнем регистре ---
export function toBackendTheme(theme) {
  return theme.toUpperCase();
}
export function toFrontendTheme(theme) {
  return theme.toLowerCase();
}

// --- auth ---
export async function authGuest() {
  const data = await request('/auth/guest', { method: 'POST' }, { allowRetry: false });
  setToken(data.token);
  return data;
}

export async function authRegister(username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function authLogin(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function authLogout() {
  await request('/auth/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
}

// Гарантирует наличие рабочей сессии: если токен в sessionStorage валиден —
// подтягивает профиль через него, иначе создаёт нового гостя.
export async function ensureSession() {
  if (getToken()) {
    try {
      return await getUser();
    } catch {
      // токен протух/невалиден — падаем в гостя ниже
    }
  }
  const guest = await authGuest();
  // /auth/guest не отдаёт puzzlePieces (AuthResponse ≠ UserResponse) — но для
  // только что созданного гостя это и так всегда нули, дальше их подтянет
  // syncProfile() через getUser().
  return {
    userId: guest.userId,
    username: guest.username,
    balance: guest.balance,
    points: guest.points,
    puzzlePieces: { PUZZLE_A: 0, PUZZLE_B: 0, PUZZLE_C: 0, PUZZLE_D: 0 },
    setsCompleted: 0,
  };
}

// --- профиль ---
export function getUser() {
  return request('/user');
}

// --- публичный конфиг (без auth) — фрагменты ставок, темы, пороги уровней ---
export function getPublicConfig() {
  return request('/config/public');
}

// --- раунд ---
export function startRound({ theme, fragmentId }) {
  return request('/round/start', {
    method: 'POST',
    body: JSON.stringify({ theme: toBackendTheme(theme), fragmentId }),
  });
}

export function getRoundState(roundId) {
  return request(`/round/${roundId}/state`);
}

export function cashoutRound(roundId) {
  return request(`/round/${roundId}/cashout`, { method: 'POST' });
}

// --- история (глобальная по умолчанию — п.1.2 ТЗ: "все пользователи прототипа") ---
export async function getHistory(limit = 20, scope = 'global') {
  const items = await request(`/history?limit=${limit}&scope=${scope}`);
  return items.map((item) => ({
    username: item.username,
    theme: toFrontendTheme(item.theme),
    betAmount: item.betAmount,
    cashoutMultiplier: item.cashoutMultiplier,
    crashMultiplier: item.crashMultiplier,
    result: item.result, // 'WIN' | 'LOSS'
    pointsEarned: item.pointsEarned,
  }));
}
