import { useEffect, useState } from 'react';
import { createRound, GameState } from '../game/engine';
import { loadPlayerName, loadSavedGame, clearSavedGame, savePlayerName } from '../lib/storage';
import ConfirmNewGameModal from './ConfirmNewGameModal';
import HowToPlayModal from './HowToPlayModal';

interface Props {
  onStart: (state: GameState) => void;
}

export default function HomeScreen({ onStart }: Props) {
  const [name, setName] = useState(() => loadPlayerName() ?? '');
  const [savedGame] = useState(() => loadSavedGame());
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  useEffect(() => {
    savePlayerName(name.trim());
  }, [name]);

  const startNewGame = () => {
    clearSavedGame();
    onStart(createRound(3, [0, 0], 1));
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
