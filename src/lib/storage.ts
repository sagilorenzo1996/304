/**
 * localStorage-backed persistence for the player's name and their
 * in-progress game, following the same guarded read / try-catch write
 * convention as src/audio/sfx.ts.
 */
import { GameState } from '../game/engine';

const GAME_KEY = '304-saved-game';
const NAME_KEY = '304-player-name';

export const CURRENT_SAVE_VERSION = 1;

interface SavedGameV1 {
  version: 1;
  savedAt: number;
  state: GameState;
}

function isSavedGameV1(value: unknown): value is SavedGameV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== CURRENT_SAVE_VERSION) return false;
  const state = v.state as GameState | undefined;
  if (!state || typeof state !== 'object') return false;
  return Array.isArray(state.hands) && state.hands.length === 4 && typeof state.phase === 'string';
}

export function saveGame(state: GameState): void {
  if (typeof localStorage === 'undefined') return;
  const payload: SavedGameV1 = { version: CURRENT_SAVE_VERSION, savedAt: Date.now(), state };
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota exceeded — save just won't persist */
  }
}

export function loadSavedGame(): GameState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedGameV1(parsed)) {
      clearSavedGame();
      return null;
    }
    return parsed.state;
  } catch {
    clearSavedGame();
    return null;
  }
}

export function clearSavedGame(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    /* private mode etc. — nothing to do */
  }
}

export function savePlayerName(name: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* private mode etc. — name just won't persist */
  }
}

export function loadPlayerName(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}
