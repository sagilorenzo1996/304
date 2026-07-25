import { Card, CARD_POINTS, Rank, RANKS, SUITS } from './types';

export type Rng = () => number;

/** Build a deck from the given ranks in each suit (the full 32-card 304 deck by default). */
export function buildDeck(ranks: Rank[] = RANKS): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export const TOTAL_POINTS = buildDeck().reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);

/** Fisher–Yates shuffle (non-mutating). */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deterministic RNG for tests / replays. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
