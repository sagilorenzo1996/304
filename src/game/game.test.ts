import { describe, expect, it } from 'vitest';
import { chooseBid, choosePlay, chooseTrumpCard } from './ai';
import { buildDeck, mulberry32, TOTAL_POINTS } from './deck';
import {
  collectTrick,
  createRound,
  GameState,
  MIN_BID,
  placeBid,
  playCard,
  requestReveal,
  selectTrump,
} from './engine';
import { legalMoves, PlayedCard, trickPoints, trickWinner } from './rules';
import { Card, Rank, Seat, Suit } from './types';

const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank });
const played = (seat: Seat, suit: Suit, rank: Rank): PlayedCard => ({ seat, card: card(suit, rank) });

describe('deck', () => {
  it('has 32 cards worth exactly 304 points', () => {
    const deck = buildDeck();
    expect(deck.length).toBe(32);
    expect(TOTAL_POINTS).toBe(304);
    expect(new Set(deck.map((c) => c.id)).size).toBe(32);
  });
});

describe('trick evaluation', () => {
  it('ranks J > 9 > A > 10 within the led suit', () => {
    const trick = [
      played(0, 'H', 'A'),
      played(1, 'H', '9'),
      played(2, 'H', 'J'),
      played(3, 'H', '10'),
    ];
    expect(trickWinner(trick, null)).toBe(2);
    expect(trickPoints(trick)).toBe(30 + 20 + 11 + 10);
  });

  it('ignores off-suit cards when no trump is in effect', () => {
    const trick = [
      played(0, 'H', '7'),
      played(1, 'S', 'J'), // discarded / hidden trump suit not revealed
      played(2, 'H', 'K'),
      played(3, 'D', 'A'),
    ];
    expect(trickWinner(trick, null)).toBe(2);
  });

  it('lets a revealed trump beat the led suit', () => {
    const trick = [
      played(0, 'H', 'J'),
      played(1, 'S', '7'),
      played(2, 'H', 'A'),
      played(3, 'H', '9'),
    ];
    expect(trickWinner(trick, 'S')).toBe(1);
  });

  it('picks the highest trump when several are played', () => {
    const trick = [
      played(0, 'H', 'A'),
      played(1, 'S', '9'),
      played(2, 'S', 'J'),
      played(3, 'H', 'J'),
    ];
    expect(trickWinner(trick, 'S')).toBe(2);
  });
});

describe('legal moves', () => {
  it('forces following the led suit when possible', () => {
    const hand = [card('H', '7'), card('S', 'J'), card('H', 'A')];
    const trick = [played(1, 'H', 'K')];
    expect(legalMoves(hand, trick).map((c) => c.id).sort()).toEqual(['H-7', 'H-A']);
  });

  it('allows any card when void in the led suit', () => {
    const hand = [card('S', 'J'), card('D', '8')];
    const trick = [played(1, 'H', 'K')];
    expect(legalMoves(hand, trick).length).toBe(2);
  });
});

describe('bidding', () => {
  it('deals 4 cards each and keeps 16 for the second deal', () => {
    const s = createRound(3, [0, 0], 1, mulberry32(1));
    expect(s.hands.every((h) => h.length === 4)).toBe(true);
    expect(s.pending.length).toBe(16);
    expect(s.bidTurn).toBe(0); // left of dealer 3
  });

  it('runs an auction: bids must rise, passers stay out', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1));
    s = placeBid(s, 0, MIN_BID);
    expect(() => placeBid(s, 1, MIN_BID)).toThrow(); // must raise
    s = placeBid(s, 1, 210);
    s = placeBid(s, 2, null);
    s = placeBid(s, 3, null);
    s = placeBid(s, 0, 220);
    s = placeBid(s, 1, null);
    expect(s.phase).toBe('trumpSelection');
    expect(s.bidder).toBe(0);
    expect(s.bid).toBe(220);
  });

  it('redeals when all four players pass', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1));
    for (let i = 0; i < 4; i++) s = placeBid(s, s.bidTurn, null, mulberry32(2));
    expect(s.phase).toBe('bidding');
    expect(s.bidHistory.length).toBe(0);
    expect(s.hands.every((h) => h.length === 4)).toBe(true);
  });
});

describe('trump selection and second deal', () => {
  it('conceals the chosen card and deals everyone up to 8', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1));
    s = placeBid(s, 0, MIN_BID);
    s = placeBid(s, 1, null);
    s = placeBid(s, 2, null);
    s = placeBid(s, 3, null);
    const chosen = s.hands[0][0];
    s = selectTrump(s, chosen.id);
    expect(s.trumpCard?.id).toBe(chosen.id);
    expect(s.trumpRevealed).toBe(false);
    expect(s.hands[0].length).toBe(7); // bidder plays one short until reveal
    expect(s.hands[1].length).toBe(8);
    expect(s.phase).toBe('playing');
    expect(s.leader).toBe(0);
  });
});

describe('trump reveal', () => {
  function startPlay(seed: number): GameState {
    let s = createRound(3, [0, 0], 1, mulberry32(seed));
    s = placeBid(s, 0, MIN_BID);
    s = placeBid(s, 1, null);
    s = placeBid(s, 2, null);
    s = placeBid(s, 3, null);
    return selectTrump(s, chooseTrumpCard(s, 0));
  }

  it('returns the concealed card to the bidder on reveal', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = startPlay(seed);
      // Lead something, then find a seat that is void and may reveal.
      s = playCard(s, s.turn, s.hands[s.turn][0].id);
      const ledSuit = s.currentTrick[0].card.suit;
      const seat = s.turn;
      if (s.hands[seat].every((c) => c.suit !== ledSuit)) {
        const before = s.hands[0].length;
        s = requestReveal(s, seat);
        expect(s.trumpRevealed).toBe(true);
        expect(s.hands[0].length).toBe(before + 1);
        return; // one verified reveal is enough
      }
    }
    throw new Error('no void seat found across seeds');
  });

  it('rejects a reveal when the player can follow suit', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = startPlay(seed);
      s = playCard(s, s.turn, s.hands[s.turn][0].id);
      const ledSuit = s.currentTrick[0].card.suit;
      if (s.hands[s.turn].some((c) => c.suit === ledSuit)) {
        expect(() => requestReveal(s, s.turn)).toThrow();
        return;
      }
    }
    throw new Error('no follow-capable seat found across seeds');
  });
});

describe('full AI round simulation', () => {
  it('plays complete rounds legally and accounts for all 304 points', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed);
      let s = createRound((seed % 4) as Seat, [0, 0], 1, rng);

      // Auction driven by the bidding AI; force an opening bid so the
      // round always proceeds.
      let forced = false;
      while (s.phase === 'bidding') {
        const bid = forced ? chooseBid(s, s.bidTurn) : MIN_BID;
        forced = true;
        s = placeBid(s, s.bidTurn, bid, rng);
      }
      s = selectTrump(s, chooseTrumpCard(s, s.bidder as Seat));

      let guard = 0;
      while (s.phase === 'playing' && guard++ < 200) {
        if (s.trickComplete) {
          s = collectTrick(s);
          continue;
        }
        const move = choosePlay(s, s.turn);
        s = move.action === 'reveal' ? requestReveal(s, s.turn) : playCard(s, s.turn, move.cardId);
      }

      expect(s.phase).toBe('roundEnd');
      expect(s.tricksPlayed).toBe(8);
      expect(s.hands.every((h) => h.length === 0)).toBe(true);
      expect(s.teamPoints[0] + s.teamPoints[1]).toBe(304);
      expect(s.roundResult).not.toBeNull();
      expect(s.matchWins[0] + s.matchWins[1]).toBe(1);
    }
  });

  it('auto-reveals the trump so the concealed card is always played', () => {
    // Run a round where nobody ever requests the reveal manually: the
    // engine must flip it for the bidder's final card.
    const rng = mulberry32(7);
    let s = createRound(3, [0, 0], 1, rng);
    while (s.phase === 'bidding') s = placeBid(s, s.bidTurn, s.highBid ? null : MIN_BID, rng);
    s = selectTrump(s, s.hands[s.bidder as Seat][0].id);

    let guard = 0;
    while (s.phase === 'playing' && guard++ < 200) {
      if (s.trickComplete) {
        s = collectTrick(s);
        continue;
      }
      // Never reveal voluntarily: always play the first legal card.
      const legal = legalMoves(s.hands[s.turn], s.currentTrick);
      s = playCard(s, s.turn, legal[0].id);
    }
    expect(s.phase).toBe('roundEnd');
    expect(s.trumpRevealed).toBe(true); // engine forced it at the end
    expect(s.teamPoints[0] + s.teamPoints[1]).toBe(304);
  });
});
