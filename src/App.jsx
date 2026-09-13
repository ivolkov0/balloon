import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from './hooks/useGameState.js';
import { useBackgroundMusic } from './hooks/useBackgroundMusic.js';
import ThemeScreen from './screens/ThemeScreen.jsx';
import BetScreen from './screens/BetScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function App() {
  const game = useGameState();
  const { musicMuted, toggleMusic } = useBackgroundMusic();

  return (
    <div className="app-shell" data-theme={game.theme}>
      <AnimatePresence mode="wait">
        <motion.div
          key={game.screen}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          {game.screen === 'theme' && (
            <ThemeScreen
              balance={game.balance}
              history={game.history}
              gameConfig={game.gameConfig}
              onSelectTheme={game.selectTheme}
              musicMuted={musicMuted}
              onToggleMusic={toggleMusic}
            />
          )}

          {game.screen === 'bet' && (
            <BetScreen
              theme={game.theme}
              setTheme={game.setTheme}
              balance={game.balance}
              betOptions={game.betOptions}
              levelsTotal={game.levelsTotal}
              history={game.history}
              puzzlePieces={game.puzzlePieces}
              setsCompleted={game.setsCompleted}
              onStart={game.startRound}
              onBack={game.goToThemeScreen}
              musicMuted={musicMuted}
              onToggleMusic={toggleMusic}
            />
          )}

          {game.screen === 'game' && (
            <GameScreen
              theme={game.theme}
              levelsTotal={game.levelsTotal}
              levelThresholds={game.levelThresholds}
              pointsPerLine={game.gameConfig?.pointsPerLine}
              round={game.round}
              current={game.current}
              anchor={game.anchor}
              onCashout={game.cashout}
              musicMuted={musicMuted}
              onToggleMusic={toggleMusic}
            />
          )}

          {game.screen === 'result' && (
            <ResultScreen round={game.round} current={game.current} onPlayAgain={game.playAgain} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
