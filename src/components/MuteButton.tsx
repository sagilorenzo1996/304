import { useState } from 'react';
import { isMuted, setMuted } from '../audio/sfx';

export default function MuteButton() {
  const [muted, setMutedState] = useState(isMuted());
  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  return (
    <button
      className="mute-btn"
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
