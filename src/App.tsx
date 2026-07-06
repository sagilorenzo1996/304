import { useState } from 'react';
import GameScreen from './components/GameScreen';
import HomeScreen from './components/HomeScreen';
import { GameState } from './game/engine';
import { LanguageProvider } from './i18n/LanguageContext';

type Screen = 'home' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null);

  const handleStart = (state: GameState) => {
    setInitialGameState(state);
    setScreen('game');
  };

  return (
    <LanguageProvider>
      <div className="app">
        {screen === 'home' && <HomeScreen onStart={handleStart} />}
        {screen === 'game' && initialGameState && <GameScreen initialState={initialGameState} />}
      </div>
    </LanguageProvider>
  );
}
