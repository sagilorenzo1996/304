import { describe, expect, it } from 'vitest';
import { buildMemory, chooseBid, choosePlay, chooseTrumpCard, isBoss } from './ai';
import { mulberry32 } from './deck';
import {
  collectTrick,
  createRound,
  GameState,
  MIN_BID,
  placeBid,
  playCard,
  requestReveal,
  selectTrump,
  submitHiddenTrump,
} from './engine';
import { legalMoves, PlayedCard } from './rules';
import { Card, Rank, Seat, Suit, teamOf } from './types';
import type { AiMove } from './ai';

const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank });
const played = (seat: Seat, suit: Suit, rank: Rank): PlayedCard => ({ seat, card: card(suit, rank) });

/** Apply an AI-chosen move to the state, dispatching to the right engine call. */
function applyMove(s: GameState, seat: Seat, move: AiMove): GameState {
  if (move.action === 'reveal') return requestReveal(s, seat);
  if (move.action === 'submitTrump') return submitHiddenTrump(s, seat);
  return playCard(s, seat, move.cardId, move.action === 'guess');
}

/** A hand-built mid-round state for targeted AI decision tests. */
function playState(over: Partial<GameState>): GameState {
  return {
    phase: 'playing',
    mode: 'classic',
    round: 1,
    dealer: 3,
    hands: [[], [], [], []],
    pending: [],
    passed: [false, true, true, true],
    bidHistory: [],
    highBid: 200,
    highBidder: 0,
    bidTurn: 0,
    bidder: 0,
    bid: 200,
    trumpCard: card('C', '7'),
    trumpRevealed: false,
    revealSeat: null,
    pendingReveals: [],
    leader: 0,
    turn: 0,
    currentTrick: [],
    trickComplete: false,
    trickWinnerSeat: null,
    tricksPlayed: 1,
    totalTricks: 8,
    trickHistory: [],
    teamPoints: [0, 0],
    matchWins: [0, 0],
    roundResult: null,
    message: '',
    ...over,
  };
}

describe('card memory', () => {
  it('collects seen cards and infers voids from off-suit plays', () => {
    const s = playState({
      trickHistory: [
        [played(0, 'H', 'J'), played(1, 'H', '9'), played(2, 'D', '8'), played(3, 'H', 'Q')],
      ],
      currentTrick: [played(1, 'S', 'A')],
      hands: [[card('S', 'K')], [], [], []],
    });
    const mem = buildMemory(s, 0);
    expect(mem.seen.has('H-J')).toBe(true);
    expect(mem.seen.has('S-A')).toBe(true); // current trick counts
    expect(mem.seen.has('S-K')).toBe(true); // own hand counts
    expect(mem.voids[2].H).toBe(true); // seat 2 showed out of hearts
    expect(mem.voids[1].H).toBe(false);
  });

  it('lets the bidder (and only the bidder) count the concealed trump as seen', () => {
    const s = playState({ trumpCard: card('C', '7'), bidder: 0 });
    expect(buildMemory(s, 0).seen.has('C-7')).toBe(true);
    expect(buildMemory(s, 1).seen.has('C-7')).toBe(false);
  });

  it('identifies boss cards once everything above them has been seen', () => {
    const s = playState({
      trickHistory: [
        [played(0, 'H', 'J'), played(1, 'H', '9'), played(2, 'H', '8'), played(3, 'H', 'Q')],
      ],
    });
    const mem = buildMemory(s, 0);
    expect(isBoss(card('H', 'A'), mem)).toBe(true); // J and 9 are gone
    expect(isBoss(card('H', '10'), mem)).toBe(false); // the A is still out
    expect(isBoss(card('S', 'J'), mem)).toBe(true); // J is always boss
  });
});

describe('AI play decisions', () => {
  it('feeds points to a partner whose card has become boss', () => {
    // J and 9 of hearts are gone; partner (seat 0) is winning with the A.
    const s = playState({
      trickHistory: [
        [played(0, 'H', 'J'), played(1, 'H', '9'), played(2, 'H', '8'), played(3, 'H', '7')],
      ],
      leader: 0,
      currentTrick: [played(0, 'H', 'A'), played(1, 'H', 'Q')],
      turn: 2,
      hands: [[], [], [card('H', '10'), card('H', 'K'), card('S', '7')], []],
    });
    const move = choosePlay(s, 2);
    expect(move).toEqual({ action: 'play', cardId: 'H-10' }); // feed the 10, not the K
  });

  it('refuses to waste a high card on a cheap trick it cannot lock up', () => {
    // Opponent leads the Q; our A could win now but the J and 9 are still
    // out, so second hand keeps the A and throws the 7.
    const s = playState({
      leader: 3,
      currentTrick: [played(3, 'H', 'Q')],
      turn: 0,
      hands: [[card('H', 'A'), card('H', 'K'), card('H', '7')], [], [], []],
    });
    expect(choosePlay(s, 0)).toEqual({ action: 'play', cardId: 'H-7' });
  });

  it('wins with the sticky boss card, banking its points', () => {
    const s = playState({
      trickHistory: [
        [played(0, 'H', 'J'), played(1, 'H', '9'), played(2, 'H', '8'), played(3, 'H', '7')],
      ],
      leader: 3,
      currentTrick: [played(3, 'H', 'K')],
      turn: 0,
      hands: [[card('H', 'A'), card('H', 'Q')], [], [], []],
    });
    expect(choosePlay(s, 0)).toEqual({ action: 'play', cardId: 'H-A' });
  });

  it('never trumps a partner who already has the trick locked up', () => {
    const s = playState({
      trumpRevealed: true,
      leader: 2,
      currentTrick: [played(2, 'H', 'J'), played(3, 'H', '7')],
      turn: 0,
      hands: [[card('C', '9'), card('D', '10'), card('D', '7')], [], [], []],
    });
    // Feed the D-10 instead of ruffing partner's boss J with the C-9.
    expect(choosePlay(s, 0)).toEqual({ action: 'play', cardId: 'D-10' });
  });

  it('ruffs a point-rich trick the opponents are winning', () => {
    const s = playState({
      trumpRevealed: true,
      leader: 3,
      currentTrick: [played(3, 'H', 'A')],
      turn: 0,
      hands: [[card('C', '7'), card('D', '8')], [], [], []],
    });
    expect(choosePlay(s, 0)).toEqual({ action: 'play', cardId: 'C-7' });
  });

  it('leads the boss trump to draw the opponents’ trumps', () => {
    const s = playState({
      trumpRevealed: true,
      bidder: 0,
      leader: 0,
      turn: 0,
      hands: [[card('C', 'J'), card('H', '7'), card('D', '7')], [], [], []],
    });
    expect(choosePlay(s, 0)).toEqual({ action: 'play', cardId: 'C-J' });
  });

  it('avoids leading a suit a known-void opponent can ruff', () => {
    const s = playState({
      trumpRevealed: true,
      leader: 0,
      turn: 0,
      // Opponent seat 1 has shown out of hearts while trumps were live.
      trickHistory: [
        [played(2, 'H', '8'), played(3, 'H', '7'), played(0, 'H', 'Q'), played(1, 'D', '7')],
      ],
      hands: [[card('H', 'K'), card('S', '8'), card('S', '7')], [], [], []],
    });
    const move = choosePlay(s, 0);
    expect(move.action).toBe('play');
    expect((move as { cardId: string }).cardId.startsWith('S')).toBe(true);
  });
});

describe('AI strength', () => {
  /** Baseline bot: always plays the first legal card and never reveals. */
  function naiveMove(state: GameState): string {
    return legalMoves(state.hands[state.turn], state.currentTrick)[0].id;
  }

  it('beats a naive first-legal-card team over many deals', () => {
    let smartPoints = 0;
    let naivePoints = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed);
      let s = createRound((seed % 4) as Seat, [0, 0], 1, rng);
      let forced = false;
      while (s.phase === 'bidding') {
        s = placeBid(s, s.bidTurn, forced ? chooseBid(s, s.bidTurn) : MIN_BID, rng);
        forced = true;
      }
      s = selectTrump(s, chooseTrumpCard(s, s.bidder as Seat));
      let guard = 0;
      while (s.phase === 'playing' && guard++ < 200) {
        if (s.trickComplete) {
          s = collectTrick(s);
          continue;
        }
        if (teamOf(s.turn) === 0) {
          s = applyMove(s, s.turn, choosePlay(s, s.turn));
        } else {
          s = playCard(s, s.turn, naiveMove(s));
        }
      }
      smartPoints += s.teamPoints[0];
      naivePoints += s.teamPoints[1];
    }
    // The memory-based AI should clearly outscore the baseline.
    expect(smartPoints).toBeGreaterThan(naivePoints * 1.3);
  });
});

describe('trick history', () => {
  it('records every completed trick in play order', () => {
    const rng = mulberry32(11);
    let s = createRound(3, [0, 0], 1, rng);
    while (s.phase === 'bidding') s = placeBid(s, s.bidTurn, s.highBid ? null : MIN_BID, rng);
    s = selectTrump(s, chooseTrumpCard(s, s.bidder as Seat));
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 200) {
      if (s.trickComplete) {
        s = collectTrick(s);
        continue;
      }
      s = applyMove(s, s.turn, choosePlay(s, s.turn));
    }
    expect(s.trickHistory.length).toBe(8);
    expect(s.trickHistory.every((t) => t.length === 4)).toBe(true);
    const ids = s.trickHistory.flat().map((p) => p.card.id);
    expect(new Set(ids).size).toBe(32);
  });
});
