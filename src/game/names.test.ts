import { describe, expect, it } from 'vitest';
import { mulberry32 } from './deck';
import { randomPlayerNames } from './names';

describe('randomPlayerNames', () => {
  it('keeps seat 0 as "You" and gives the other three seats distinct names', () => {
    const names = randomPlayerNames(mulberry32(1));
    expect(names[0]).toBe('You');
    const opponentNames = [names[1], names[2], names[3]];
    expect(new Set(opponentNames).size).toBe(3);
    expect(opponentNames.every((n) => n.length > 0 && n !== 'You')).toBe(true);
  });

  it('varies with the rng seed', () => {
    const a = randomPlayerNames(mulberry32(1));
    const b = randomPlayerNames(mulberry32(2));
    expect([a[1], a[2], a[3]]).not.toEqual([b[1], b[2], b[3]]);
  });
});
