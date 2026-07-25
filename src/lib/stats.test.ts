import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoundResult } from '../game/engine';
import { clearStats, loadStats, recordRoundResult } from './stats';

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

const humanWinResult = (over: Partial<RoundResult> = {}): RoundResult => ({
  bidder: 0,
  bidderTeam: 0,
  bid: 220,
  bidderTeamPoints: 230,
  defenderTeamPoints: 74,
  success: true,
  ...over,
});

describe('stats', () => {
  it('starts empty', () => {
    expect(loadStats()).toEqual({
      roundsPlayed: 0,
      roundsWon: 0,
      roundsLost: 0,
      bidsAttempted: 0,
      bidsMade: 0,
      highestBidMade: 0,
      totalPointsWon: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('records a round the human team won while human was the bidder', () => {
    const stats = recordRoundResult(humanWinResult());
    expect(stats.roundsPlayed).toBe(1);
    expect(stats.roundsWon).toBe(1);
    expect(stats.roundsLost).toBe(0);
    expect(stats.totalPointsWon).toBe(230);
    expect(stats.bidsAttempted).toBe(1);
    expect(stats.bidsMade).toBe(1);
    expect(stats.highestBidMade).toBe(220);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
  });

  it('records a round the human team won on defense (an opponent bid and failed)', () => {
    const stats = recordRoundResult(
      humanWinResult({ bidder: 1, bidderTeam: 1, bidderTeamPoints: 150, defenderTeamPoints: 154, success: false }),
    );
    expect(stats.roundsWon).toBe(1);
    expect(stats.totalPointsWon).toBe(154); // the human team's (defender's) points
    expect(stats.bidsAttempted).toBe(0); // an opponent bid, not the human
    expect(stats.bidsMade).toBe(0);
  });

  it('records a loss and resets the current streak', () => {
    recordRoundResult(humanWinResult());
    const stats = recordRoundResult(
      humanWinResult({ bidderTeamPoints: 150, defenderTeamPoints: 154, success: false }),
    );
    expect(stats.roundsPlayed).toBe(2);
    expect(stats.roundsWon).toBe(1);
    expect(stats.roundsLost).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(1); // best streak survives the loss
    expect(stats.bidsAttempted).toBe(2);
    expect(stats.bidsMade).toBe(1); // the failed bid doesn't count as made
  });

  it('does not lower highestBidMade when a later successful bid is smaller', () => {
    recordRoundResult(humanWinResult({ bid: 260 }));
    const stats = recordRoundResult(humanWinResult({ bid: 200 }));
    expect(stats.highestBidMade).toBe(260);
  });

  it('persists across loads and clears on demand', () => {
    recordRoundResult(humanWinResult());
    expect(loadStats().roundsPlayed).toBe(1);
    clearStats();
    expect(loadStats().roundsPlayed).toBe(0);
  });
});
