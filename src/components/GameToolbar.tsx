import { useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';

interface Props {
  onQuit: () => void;
  onHelp: () => void;
}

/** Top-right in-game menu: a rules refresher and a way back to the main menu. */
export default function GameToolbar({ onQuit, onHelp }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="game-toolbar">
      <button
        className="menu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('game.menu')}
        title={t('game.menu')}
      >
        ☰
      </button>
      {open && (
        <div className="menu-dropdown">
          <button
            className="btn"
            onClick={() => {
              setOpen(false);
              onHelp();
            }}
          >
            {t('game.howToPlay')}
          </button>
          <button
            className="btn danger"
            onClick={() => {
              setOpen(false);
              onQuit();
            }}
          >
            {t('game.quitToMenu')}
          </button>
        </div>
      )}
    </div>
  );
}
