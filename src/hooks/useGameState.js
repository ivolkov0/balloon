import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGameConfig, POLL_INTERVAL_MS, STARTING_BALANCE_FALLBACK } from '../api/config.js';
import * as api from '../api/client.js';

const RESULT_AUTO_REDIRECT_MS = 10_000;
const CRASH_VISUAL_DELAY_MS = 700; // даёт GameScreen время проиграть тряску/эффект краха

const DEFAULT_RATE = 0.15; // разумный дефолт до первого замера скорости роста (см. useSmoothFlight.js)

/**
 * Единый стейт игрового цикла: экран, тема, баланс, текущий раунд, история.
 * Ходит в реальный бэкенд через api/client.js: гостевая сессия, публичный
 * конфиг (GET /api/config/public — фрагменты ставок и пороги уровней,
 * бэкенд больше не отдаёт клиенту betAmount/boosterValue как "доверенные"
 * значения, только id фрагмента), поллинг раунда, cashout, история.
 *
 * Важно: раунд не завершается в момент cashout — сервер переводит его в
 * CASHED_OUT и шар продолжает лететь до настоящего краха (см. README
 * бэкенда п.6.6/8.1) — экран игры и опрос продолжаются, пока не придёт
 * CRASHED.
 */
export function useGameState() {
  const [screen, setScreen] = useState('theme'); // 'theme' | 'bet' | 'game' | 'result'
  const [theme, setTheme] = useState('green');
  const [balance, setBalance] = useState(STARTING_BALANCE_FALLBACK);
  const [points, setPoints] = useState(0);
  // Коллекция пазла (п.1.5 ТЗ) — копится навсегда на сервере (User.puzzleX),
  // не только на экране результата. { PUZZLE_A: 2, PUZZLE_B: 0, ... }.
  const [puzzlePieces, setPuzzlePieces] = useState({ PUZZLE_A: 0, PUZZLE_B: 0, PUZZLE_C: 0, PUZZLE_D: 0 });
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [history, setHistory] = useState([]);
  const [gameConfig, setGameConfig] = useState(null); // loadGameConfig() — фрагменты + пороги уровней по темам
  const [round, setRound] = useState(null); // {roundId, theme, fragmentId, betAmount, boosterValue, levelsTotal, levelThresholds, startedAtMs}
  const [current, setCurrent] = useState(null); // последний RoundStateResponse с бэка
  const [anchor, setAnchor] = useState(null); // { multiplier, at, rate } — точка отсчёта для useSmoothFlight

  const pollRef = useRef(null);
  const crashTimeoutRef = useRef(null);
  const bootstrappedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshHistory = useCallback(() => {
    api
      .getHistory(20, 'global')
      .then(setHistory)
      .catch((err) => console.error('Не удалось загрузить историю', err));
  }, []);

  // Сессия + публичный конфиг + история — один раз при монтировании.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    api
      .ensureSession()
      .then((user) => {
        setBalance(user.balance);
        setPoints(user.points ?? 0);
        if (user.puzzlePieces) setPuzzlePieces(user.puzzlePieces);
        if (user.setsCompleted != null) setSetsCompleted(user.setsCompleted);
      })
      .catch((err) => console.error('Не удалось создать сессию', err));

    loadGameConfig()
      .then(setGameConfig)
      .catch((err) => console.error('Не удалось загрузить конфиг игры', err));

    refreshHistory();
  }, [refreshHistory]);

  const syncProfile = useCallback(() => {
    api
      .getUser()
      .then((user) => {
        setBalance(user.balance);
        setPoints(user.points ?? 0);
        if (user.puzzlePieces) setPuzzlePieces(user.puzzlePieces);
        if (user.setsCompleted != null) setSetsCompleted(user.setsCompleted);
      })
      .catch((err) => console.error('Не удалось обновить баланс', err));
  }, []);

  // Оценка локальной скорости роста по двум последним серверным точкам
  // (см. useSmoothFlight.js) — сервер не отдаёт growthRate напрямую.
  const pushAnchor = useCallback((newMultiplier) => {
    setAnchor((prev) => {
      const now = Date.now();
      let rate = prev?.rate ?? DEFAULT_RATE;
      if (prev && now > prev.at && prev.multiplier > 0 && newMultiplier > 0) {
        const dt = (now - prev.at) / 1000;
        if (dt > 0.05) {
          const estimated = Math.log(newMultiplier / prev.multiplier) / dt;
          if (Number.isFinite(estimated) && estimated > 0) rate = estimated;
        }
      }
      return { multiplier: newMultiplier, at: now, rate };
    });
  }, []);

  const finishRound = useCallback(
    (finalState) => {
      stopPolling();
      setCurrent(finalState);
      pushAnchor(finalState.crashMultiplier ?? finalState.currentMultiplier);
      syncProfile();
      refreshHistory();
      // Небольшая пауза перед переходом на экран результата — даёт GameScreen
      // время проиграть тряску/анимацию краха, вместо мгновенной подмены экрана.
      clearTimeout(crashTimeoutRef.current);
      crashTimeoutRef.current = setTimeout(() => setScreen('result'), CRASH_VISUAL_DELAY_MS);
    },
    [stopPolling, pushAnchor, syncProfile, refreshHistory]
  );

  const startPolling = useCallback(
    (roundSnapshot) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const state = await api.getRoundState(roundSnapshot.roundId);
          setCurrent(state);
          pushAnchor(state.currentMultiplier);
          if (state.status === 'CRASHED') {
            finishRound(state);
          }
          // CASHED_OUT — шар всё ещё летит, опрос продолжается до CRASHED.
        } catch (err) {
          console.error('Ошибка опроса состояния раунда', err);
        }
      }, POLL_INTERVAL_MS);
    },
    [finishRound, pushAnchor, stopPolling]
  );

  const startRound = useCallback(
    async (fragmentId) => {
      const fragment = gameConfig?.betOptions.find((f) => f.fragmentId === fragmentId);
      if (!fragment || fragment.betAmount > balance) return;
      try {
        const started = await api.startRound({ theme, fragmentId });
        const roundSnapshot = {
          roundId: started.roundId,
          theme,
          fragmentId,
          betAmount: started.betAmount,
          boosterValue: started.boosterValue,
          levelsTotal: started.levelsTotal,
          levelThresholds: started.levelThresholds,
          startedAtMs: Date.parse(started.startedAt),
          // Provably fair (п.2.3 ТЗ): sha256(serverSeed) — раскрытого после
          // краха — должен совпасть с этим хешем, известным ДО полёта.
          seedHash: started.seedHash,
        };
        setBalance((b) => b - started.betAmount); // сервер уже списал ровно betAmount при старте
        setRound(roundSnapshot);
        setAnchor({ multiplier: 1, at: Date.now(), rate: DEFAULT_RATE });
        setCurrent({
          status: 'IN_PROGRESS',
          currentMultiplier: 1,
          levelsPassed: 0,
          boosterTriggered: false,
          cashoutMultiplier: null,
          crashMultiplier: null,
          pointsEarned: 0,
          reward: null,
          missedMultiplier: null,
          serverSeed: null,
          canCashout: false,
        });
        setScreen('game');
        startPolling(roundSnapshot);
      } catch (err) {
        console.error('Не удалось начать раунд', err);
      }
    },
    [balance, gameConfig, theme, startPolling]
  );

  const cashout = useCallback(async () => {
    if (!round || !current?.canCashout) return;
    try {
      const state = await api.cashoutRound(round.roundId);
      setCurrent(state);
      pushAnchor(state.currentMultiplier);
      if (state.status === 'CRASHED') {
        // Не успел — шар лопнул раньше, чем долетел запрос.
        finishRound(state);
      } else {
        // CASHED_OUT: выигрыш зафиксирован и уже начислен на баланс сервером,
        // но раунд не завершён — шар летит дальше, опрос продолжается.
        syncProfile();
      }
    } catch (err) {
      console.error('Не удалось забрать выигрыш', err);
    }
  }, [round, current, pushAnchor, finishRound, syncProfile]);

  const playAgain = useCallback(() => {
    setRound(null);
    setCurrent(null);
    setAnchor(null);
    setScreen('bet');
  }, []);

  // Экран выбора темы (п. 1.1 ТЗ, дополнительная возможность) — выбор шара
  // сразу выставляет тему и переводит на экран ставки.
  const selectTheme = useCallback((themeId) => {
    setTheme(themeId);
    setScreen('bet');
  }, []);

  const goToThemeScreen = useCallback(() => setScreen('theme'), []);

  // Автопереход с экрана результата через 10 секунд бездействия (п. 1.5 ТЗ)
  useEffect(() => {
    if (screen !== 'result') return undefined;
    const t = setTimeout(playAgain, RESULT_AUTO_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [screen, playAgain]);

  useEffect(() => {
    return () => {
      stopPolling();
      clearTimeout(crashTimeoutRef.current);
    };
  }, [stopPolling]);

  const themePublicConfig = gameConfig?.themes?.[theme];

  return {
    screen,
    theme,
    setTheme,
    balance,
    points,
    puzzlePieces,
    setsCompleted,
    history,
    round,
    current,
    anchor,
    gameConfig,
    levelsTotal: round?.levelsTotal ?? themePublicConfig?.levelsTotal ?? 0,
    levelThresholds: round?.levelThresholds ?? themePublicConfig?.levelThresholds ?? [],
    betOptions: gameConfig?.betOptions ?? [],
    startRound,
    cashout,
    playAgain,
    selectTheme,
    goToThemeScreen,
  };
}
