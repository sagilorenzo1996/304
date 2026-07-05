import { useState } from 'react';
import { isMuted, setMuted } from '../audio/sfx';
import { useI18n } from '../i18n/LanguageContext';

export default function MuteButton() {
  const { t } = useI18n();
  const [muted, setMutedState] = useState(isMuted());
  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  const label = t(muted ? 'mute.unmute' : 'mute.mute');
  return (
    <button className="mute-btn" onClick={toggle} aria-label={label} title={label}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
