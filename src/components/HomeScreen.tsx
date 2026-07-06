import { useEffect, useState } from 'react';
import { createRound, GAME_MODES, GameMode, GameState } from '../game/engine';
import { useI18n } from '../i18n/LanguageContext';
import { loadPlayerName, loadSavedGame, clearSavedGame, savePlayerName } from '../lib/storage';
import ConfirmNewGameModal from './ConfirmNewGameModal';
import HowToPlayModal from './HowToPlayModal';
import LanguageToggle from './LanguageToggle';
import StatsModal from './StatsModal';

interface Props {
  onStart: (state: GameState) => void;
}

export default function HomeScreen({ onStart }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(() => loadPlayerName() ?? '');
  const [savedGame] = useState(() => loadSavedGame());
  const [mode, setMode] = useState<GameMode>('classic');
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

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
      <LanguageToggle />
      <div className="overlay">
        <div className="modal">
          <h2>{trimmed ? t('home.welcomeBack', { name: trimmed }) : t('home.welcome')}</h2>
          <p className="modal-sub">{t('home.tagline')}</p>
          <input
            className="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('home.namePlaceholder')}
          />
          <div className="mode-picker">
            {GAME_MODES.map((id) => (
              <button
                key={id}
                type="button"
                className={`mode-option${mode === id ? ' active' : ''}`}
                onClick={() => setMode(id)}
              >
                {t(`mode.${id}.label`)}
              </button>
            ))}
          </div>
          <p className="modal-sub mode-description">{t(`mode.${mode}.description`)}</p>
          <div className="home-actions">
            <button className="btn primary" onClick={handleNewGame}>
              {t('home.newGame')}
            </button>
            {savedGame && (
              <button className="btn" onClick={() => onStart(savedGame)}>
                {t('home.resumeGame')}
              </button>
            )}
            <button className="btn" onClick={() => setHowToPlayOpen(true)}>
              {t('home.howToPlay')}
            </button>
            <button className="btn" onClick={() => setStatsOpen(true)}>
              {t('home.stats')}
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
      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
    </>
  );
}
