/**
 * localStorage-backed lifetime stats for the human player (seat 0 / team 0),
 * following the same guarded read / try-catch write convention as
 * src/lib/storage.ts.
 */
import { RoundResult } from '../game/engine';

const STATS_KEY = '304-stats';

export interface Stats {
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  bidsAttempted: number; // times you were the bidder
  bidsMade: number; // times your bid succeeded
  highestBidMade: number;
  totalPointsWon: number; // your team's captured card points, summed across rounds
  currentStreak: number; // consecutive rounds won
  bestStreak: number;
}

const EMPTY_STATS: Stats = {
  roundsPlayed: 0,
  roundsWon: 0,
  roundsLost: 0,
  bidsAttempted: 0,
  bidsMade: 0,
  highestBidMade: 0,
  totalPointsWon: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export function loadStats(): Stats {
  if (typeof localStorage === 'undefined') return { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    return { ...EMPTY_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(stats: Stats): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* private mode / quota exceeded — stats just won't persist */
  }
}

/** Record the outcome of a just-finished round (team 0 / seat 0 is human). */
export function recordRoundResult(result: RoundResult): Stats {
  const stats = loadStats();
  const humanWon = (result.bidderTeam === 0) === result.success;
  const humanPoints = result.bidderTeam === 0 ? result.bidderTeamPoints : result.defenderTeamPoints;

  stats.roundsPlayed += 1;
  stats.totalPointsWon += humanPoints;
  if (humanWon) {
    stats.roundsWon += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else {
    stats.roundsLost += 1;
    stats.currentStreak = 0;
  }
  if (result.bidder === 0) {
    stats.bidsAttempted += 1;
    if (result.success) {
      stats.bidsMade += 1;
      stats.highestBidMade = Math.max(stats.highestBidMade, result.bid);
    }
  }

  saveStats(stats);
  return stats;
}

export function clearStats(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    /* private mode etc. — nothing to do */
  }
}
