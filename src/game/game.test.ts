import { describe, expect, it } from 'vitest';
import { chooseBid, choosePlay, chooseTrumpCard } from './ai';
import { buildDeck, mulberry32, TOTAL_POINTS } from './deck';
import {
  canGuessTrump,
  canRequestReveal,
  collectTrick,
  createRound,
  GameState,
  MIN_BID,
  nextRound,
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

describe('game modes', () => {
  it('open mode reveals the trump immediately and gives the bidder a full 8-card hand', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1), 'open');
    s = placeBid(s, 0, MIN_BID);
    s = placeBid(s, 1, null);
    s = placeBid(s, 2, null);
    s = placeBid(s, 3, null);
    s = selectTrump(s, s.hands[0][0].id);
    expect(s.trumpRevealed).toBe(true);
    expect(s.hands[0].length).toBe(8);
    expect(canRequestReveal(s, 1)).toBe(false); // nothing left to reveal
  });

  it('blind mode never lets any seat request a reveal, bidder included', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = createRound(3, [0, 0], 1, mulberry32(seed), 'blind');
      s = placeBid(s, 0, MIN_BID);
      s = placeBid(s, 1, null);
      s = placeBid(s, 2, null);
      s = placeBid(s, 3, null);
      s = selectTrump(s, chooseTrumpCard(s, 0)); // bidder is seat 0
      s = playCard(s, s.turn, s.hands[s.turn][0].id);
      const ledSuit = s.currentTrick[0].card.suit;
      const seat = s.turn;
      if (s.hands[seat].every((c) => c.suit !== ledSuit)) {
        expect(canRequestReveal(s, seat)).toBe(false);
        expect(() => requestReveal(s, seat)).toThrow();
        return;
      }
    }
    throw new Error('no void seat found across seeds');
  });

  it('blind mode lets the bidder reveal early only via a face-down guess when void', () => {
    for (let seed = 1; seed < 60; seed++) {
      let s = createRound(3, [0, 0], 1, mulberry32(seed), 'blind');
      s = placeBid(s, 0, MIN_BID);
      s = placeBid(s, 1, null);
      s = placeBid(s, 2, null);
      s = placeBid(s, 3, null);
      s = selectTrump(s, chooseTrumpCard(s, 0)); // bidder is seat 0

      // Fast-forward, always playing a legal card, until it's the bidder's
      // turn mid-trick (i.e. not leading).
      let guard = 0;
      while (guard++ < 100 && s.phase === 'playing') {
        if (s.trickComplete) {
          s = collectTrick(s);
          continue;
        }
        if (s.turn === 0 && s.currentTrick.length > 0) break;
        const move = legalMoves(s.hands[s.turn], s.currentTrick)[0];
        s = playCard(s, s.turn, move.id, canGuessTrump(s, s.turn));
      }
      const trumpCardInHand = s.hands[0].find((c) => c.suit === s.trumpCard!.suit);
      if (
        s.phase !== 'playing' ||
        s.turn !== 0 ||
        s.currentTrick.length === 0 ||
        s.hands[0].some((c) => c.suit === s.currentTrick[0].card.suit) ||
        !trumpCardInHand
      ) {
        continue; // bidder can follow suit, has no trump left, or this deal never reached the scenario
      }
      expect(canRequestReveal(s, 0)).toBe(false);
      expect(canGuessTrump(s, 0)).toBe(true);
      const before = s.hands[0].length;
      s = playCard(s, 0, trumpCardInHand.id, true);
      expect(s.trumpRevealed).toBe(true);
      expect(s.hands[0].length).toBe(before);
      return;
    }
    throw new Error('no void-bidder-mid-trick scenario found across seeds');
  });

  it('lets a void non-bidder submit a hidden trump guess', () => {
    // Force a low bid so the round always proceeds regardless of hand
    // strength, then fast-forward to the first non-bidder void seat.
    for (let seed = 1; seed < 60; seed++) {
      let s = createRound(3, [0, 0], 1, mulberry32(seed), 'blind');
      s = placeBid(s, 0, MIN_BID);
      s = placeBid(s, 1, null);
      s = placeBid(s, 2, null);
      s = placeBid(s, 3, null);
      s = selectTrump(s, chooseTrumpCard(s, 0)); // bidder is seat 0
      s = playCard(s, s.turn, s.hands[s.turn][0].id);
      const ledSuit = s.currentTrick[0].card.suit;
      const seat = s.turn;
      if (seat === 0 || !s.hands[seat].every((c) => c.suit !== ledSuit)) continue;

      expect(canGuessTrump(s, seat)).toBe(true);
      const before = s.hands[seat].length;
      const guessCard = s.hands[seat][0];
      const isTrump = guessCard.suit === s.trumpCard!.suit;
      s = playCard(s, seat, guessCard.id, true);

      expect(s.hands[seat].length).toBe(before - 1);
      expect(s.currentTrick.find((p) => p.card.id === guessCard.id)?.concealed).toBe(!isTrump);
      expect(s.trumpRevealed).toBe(isTrump);
      return;
    }
    throw new Error('no void non-bidder seat found across seeds');
  });

  it('rejects a hidden guess before a trick is in progress, or in classic mode', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1), 'blind');
    s = placeBid(s, 0, MIN_BID);
    s = placeBid(s, 1, null);
    s = placeBid(s, 2, null);
    s = placeBid(s, 3, null);
    s = selectTrump(s, chooseTrumpCard(s, 0));
    expect(canGuessTrump(s, 0)).toBe(false); // no trick in progress yet
    expect(canGuessTrump(s, 1)).toBe(false); // no trick in progress yet

    // Classic mode never offers the guess option, even when void.
    let classic = createRound(3, [0, 0], 1, mulberry32(1), 'classic');
    classic = placeBid(classic, 0, MIN_BID);
    classic = placeBid(classic, 1, null);
    classic = placeBid(classic, 2, null);
    classic = placeBid(classic, 3, null);
    classic = selectTrump(classic, chooseTrumpCard(classic, 0));
    classic = playCard(classic, classic.turn, classic.hands[classic.turn][0].id);
    expect(canGuessTrump(classic, classic.turn)).toBe(false);
  });

  it('forces a face-down guess when void in blind mode, rejecting an ordinary face-up play', () => {
    for (let seed = 1; seed < 60; seed++) {
      let s = createRound(3, [0, 0], 1, mulberry32(seed), 'blind');
      s = placeBid(s, 0, MIN_BID);
      s = placeBid(s, 1, null);
      s = placeBid(s, 2, null);
      s = placeBid(s, 3, null);
      s = selectTrump(s, chooseTrumpCard(s, 0)); // bidder is seat 0
      s = playCard(s, s.turn, s.hands[s.turn][0].id);
      const ledSuit = s.currentTrick[0].card.suit;
      const seat = s.turn;
      if (!s.hands[seat].every((c) => c.suit !== ledSuit)) continue;

      expect(canGuessTrump(s, seat)).toBe(true);
      const cardId = s.hands[seat][0].id;
      expect(() => playCard(s, seat, cardId)).toThrow();
      expect(() => playCard(s, seat, cardId, false)).toThrow();
      expect(() => playCard(s, seat, cardId, true)).not.toThrow();
      return;
    }
    throw new Error('no void seat found across seeds');
  });

  it('completes full blind-mode rounds regardless of when the trump is revealed', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed);
      let s = createRound((seed % 4) as Seat, [0, 0], 1, rng, 'blind');
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
        s =
          move.action === 'reveal'
            ? requestReveal(s, s.turn)
            : playCard(s, s.turn, move.cardId, move.action === 'guess');
      }

      expect(s.phase).toBe('roundEnd');
      expect(s.tricksPlayed).toBe(8);
      expect(s.teamPoints[0] + s.teamPoints[1]).toBe(304);
    }
  });

  it('carries the mode through a redeal and into the next round', () => {
    let s = createRound(3, [0, 0], 1, mulberry32(1), 'blind');
    for (let i = 0; i < 4; i++) s = placeBid(s, s.bidTurn, null, mulberry32(2));
    expect(s.phase).toBe('bidding'); // redealt
    expect(s.mode).toBe('blind');

    const rng = mulberry32(3);
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
      s =
        move.action === 'reveal'
          ? requestReveal(s, s.turn)
          : playCard(s, s.turn, move.cardId, move.action === 'guess');
    }
    s = nextRound(s, mulberry32(4));
    expect(s.mode).toBe('blind');
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
