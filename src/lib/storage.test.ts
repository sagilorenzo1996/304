import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../game/deck';
import { createRound } from '../game/engine';
import {
  clearSavedGame,
  loadPlayerName,
  loadSavedGame,
  saveGame,
  savePlayerName,
} from './storage';

function fakeLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('game save/load', () => {
  it('round-trips an identical state', () => {
    const state = createRound(3, [0, 0], 1, mulberry32(42));
    saveGame(state);
    expect(loadSavedGame()).toEqual(state);
  });

  it('returns null on an empty store', () => {
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null and clears the entry on a version mismatch', () => {
    localStorage.setItem(
      '304-saved-game',
      JSON.stringify({ version: 999, savedAt: Date.now(), state: {} }),
    );
    expect(loadSavedGame()).toBeNull();
    expect(localStorage.getItem('304-saved-game')).toBeNull();
  });

  it('returns null (not throw) on malformed JSON', () => {
    localStorage.setItem('304-saved-game', '{not json');
    expect(() => loadSavedGame()).not.toThrow();
    expect(loadSavedGame()).toBeNull();
  });

  it('returns null when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadSavedGame()).toBeNull();
  });

  it('swallows a setItem that throws', () => {
    vi.stubGlobal('localStorage', {
      ...fakeLocalStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    const state = createRound(3, [0, 0], 1, mulberry32(1));
    expect(() => saveGame(state)).not.toThrow();
  });

  it('clears the saved game', () => {
    const state = createRound(3, [0, 0], 1, mulberry32(7));
    saveGame(state);
    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });
});

describe('player name', () => {
  it('round-trips a name', () => {
    savePlayerName('Alex');
    expect(loadPlayerName()).toBe('Alex');
  });

  it('returns null when unset', () => {
    expect(loadPlayerName()).toBeNull();
  });
});
