import { useEffect, useState } from 'react';
import { createRound, GAME_MODES, GameMode, GameState } from '../game/engine';
import { loadPlayerName, loadSavedGame, clearSavedGame, savePlayerName } from '../lib/storage';
import ConfirmNewGameModal from './ConfirmNewGameModal';
import HowToPlayModal from './HowToPlayModal';

interface Props {
  onStart: (state: GameState) => void;
}

export default function HomeScreen({ onStart }: Props) {
  const [name, setName] = useState(() => loadPlayerName() ?? '');
  const [savedGame] = useState(() => loadSavedGame());
  const [mode, setMode] = useState<GameMode>('classic');
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  useEffect(() => {
    savePlayerName(name.trim());
  }, [name]);

  const startNewGame = () => {
    clearSavedGame();
    onStart(createRound(3, [0, 0], 1, Math.random, mode));
  };

  const handleNewGame = () => {
    if (savedGame) {
      setConfirmingNewGame(true);
    } else {
      startNewGame();
    }
  };

  const trimmed = name.trim();

  return (
    <>
      <div className="overlay">
        <div className="modal">
          <h2>{trimmed ? `Welcome back, ${trimmed}!` : 'Welcome!'}</h2>
          <p className="modal-sub">304 — the classic South Indian trick-taking card game.</p>
          <input
            className="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <div className="mode-picker">
            {GAME_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-option${mode === m.id ? ' active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="modal-sub mode-description">
            {GAME_MODES.find((m) => m.id === mode)!.description}
          </p>
          <div className="home-actions">
            <button className="btn primary" onClick={handleNewGame}>
              New Game
            </button>
            {savedGame && (
              <button className="btn" onClick={() => onStart(savedGame)}>
                Resume Game
              </button>
            )}
            <button className="btn" onClick={() => setHowToPlayOpen(true)}>
              How to Play
            </button>
          </div>
        </div>
      </div>
      {confirmingNewGame && (
        <ConfirmNewGameModal
          onConfirm={() => {
            setConfirmingNewGame(false);
            startNewGame();
          }}
          onCancel={() => setConfirmingNewGame(false)}
        />
      )}
      {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}
    </>
  );
}
