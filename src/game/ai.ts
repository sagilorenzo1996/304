/**
 * Heuristic engine for the three automated players.
 *
 * The AI is intentionally information-honest: only the bidder "knows" the
 * trump suit before it is revealed, and no AI ever looks at another
 * player's hand.
 */
import { effectiveTrump, GameState, isValidBid, MIN_BID, BID_STEP, trumpSuitOf } from './engine';
import { currentWinner, isVoidInLedSuit, legalMoves, trickPoints } from './rules';
import { Card, Seat, Suit, SUITS, cardPoints, cardPower, teamOf } from './types';

export type AiMove = { action: 'reveal' } | { action: 'play'; cardId: string };

const bySuit = (hand: Card[]): Record<Suit, Card[]> => {
  const groups = { S: [], H: [], D: [], C: [] } as Record<Suit, Card[]>;
  for (const card of hand) groups[card.suit].push(card);
  return groups;
};

/**
 * Strength of a suit as a trump/bidding candidate: raw card points plus a
 * length bonus, discounted when the suit is missing its top cards (J, 9) —
 * a suit without them is easily overpowered.
 */
function suitStrength(cards: Card[]): number {
  if (cards.length === 0) return 0;
  let score = cards.reduce((sum, c) => sum + cardPoints(c), 0) + (cards.length - 1) * 8;
  if (!cards.some((c) => c.rank === 'J')) score -= 12;
  if (!cards.some((c) => c.rank === '9')) score -= 8;
  return Math.max(score, 0);
}

/**
 * Bidding AI: evaluate the first four cards and return the lowest legal
 * raise if the hand justifies it, or null to pass. Only hands with high
 * cards (J / 9) concentrated in one suit bid aggressively.
 */
export function chooseBid(state: GameState, seat: Seat): number | null {
  const hand = state.hands[seat];
  const groups = bySuit(hand);
  const best = Math.max(...SUITS.map((s) => suitStrength(groups[s])));
  const bestSuit = SUITS.find((s) => suitStrength(groups[s]) === best) as Suit;
  const sidePoints = hand
    .filter((c) => c.suit !== bestSuit)
    .reduce((sum, c) => sum + cardPoints(c), 0);

  const willingness = 190 + best + Math.round(sidePoints * 0.3);
  const need = state.highBid === null ? MIN_BID : state.highBid + BID_STEP;
  if (need > willingness || !isValidBid(state, need)) return null;
  return need;
}

/**
 * Trump selection AI: pick the strongest suit, preferring suits with more
 * than one card, and conceal its *lowest* card so the big trumps stay in
 * hand for play.
 */
export function chooseTrumpCard(state: GameState, seat: Seat): string {
  const hand = state.hands[seat];
  const groups = bySuit(hand);
  let bestSuit: Suit = hand[0].suit;
  let bestScore = -Infinity;
  for (const suit of SUITS) {
    const cards = groups[suit];
    if (cards.length === 0) continue;
    const score = suitStrength(cards) - (cards.length === 1 ? 15 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }
  const lowest = groups[bestSuit].reduce((a, b) => (cardPower(b) < cardPower(a) ? b : a));
  return lowest.id;
}

const lowestBy = (cards: Card[], score: (c: Card) => number): Card =>
  cards.reduce((a, b) => (score(b) < score(a) ? b : a));

/** Cheapest card to give away: minimize points first, then rank power. */
const throwaway = (cards: Card[]): Card => lowestBy(cards, (c) => cardPoints(c) * 10 + cardPower(c));

/** Highest-point card to feed to a winning partner (ties broken low). */
const feedCard = (cards: Card[]): Card =>
  lowestBy(cards, (c) => -(cardPoints(c) * 10) + cardPower(c));

/**
 * Playing AI. May return `{action:'reveal'}` when void in the led suit;
 * the caller applies the reveal and asks again for the actual card.
 */
export function choosePlay(state: GameState, seat: Seat): AiMove {
  const hand = state.hands[seat];
  const trick = state.currentTrick;
  const legal = legalMoves(hand, trick);
  const trump = effectiveTrump(state); // null while concealed
  const isBidder = seat === state.bidder;

  // ---- Leading a trick -------------------------------------------------
  if (trick.length === 0) {
    const jacks = legal.filter((c) => c.rank === 'J');
    if (jacks.length > 0) {
      // Lead the J from the longest of our J-suits: it is the boss card of
      // its suit and cashes 30 points (barring a trump).
      const groups = bySuit(hand);
      return {
        action: 'play',
        cardId: jacks.reduce((a, b) => (groups[b.suit].length > groups[a.suit].length ? b : a)).id,
      };
    }
    // Otherwise probe with a cheap card from our longest suit.
    const groups = bySuit(hand);
    const longest = SUITS.reduce((a, b) => (groups[b].length > groups[a].length ? b : a));
    return { action: 'play', cardId: throwaway(groups[longest].length ? groups[longest] : legal).id };
  }

  // ---- Following to a trick --------------------------------------------
  const winner = currentWinner(trick, trump)!;
  const partnerWinning = teamOf(winner.seat) === teamOf(seat);
  const isLast = trick.length === 3;
  const wouldWin = (card: Card): boolean =>
    currentWinner([...trick, { seat, card }], trump)!.seat === seat;

  const voidInLed = isVoidInLedSuit(hand, trick);

  // Consider asking for the trump reveal when unable to follow suit.
  if (voidInLed && !state.trumpRevealed) {
    const groups = bySuit(hand);
    const wantsReveal = isBidder
      ? // The bidder knows the trump; reveal only when actually holding
        // trumps and there is something worth taking.
        hand.some((c) => c.suit === trumpSuitOf(state)) &&
        (!partnerWinning || trickPoints(trick) >= 20)
      : // Others gamble: reveal when holding strong cards (J, or a guarded 9)
        // in some suit, hoping it is — or can beat — the trump.
        !partnerWinning &&
        SUITS.some(
          (s) => groups[s].some((c) => c.rank === 'J') || (groups[s].length >= 2 && groups[s].some((c) => c.rank === '9')),
        );
    if (wantsReveal) return { action: 'reveal' };
  }

  if (!voidInLed) {
    const partnerSecure = partnerWinning && (isLast || winner.card.rank === 'J');
    if (partnerSecure) {
      // Feed points (10s, Aces...) to a partner who has the trick locked up.
      return { action: 'play', cardId: feedCard(legal).id };
    }
    const winning = legal.filter(wouldWin);
    if (winning.length > 0 && !partnerWinning) {
      // Take it as cheaply as possible: the lowest card that still wins.
      return { action: 'play', cardId: lowestBy(winning, cardPower).id };
    }
    return { action: 'play', cardId: throwaway(legal).id };
  }

  // ---- Void in the led suit ---------------------------------------------
  const trumpSuit = trumpSuitOf(state);
  if (trump && trumpSuit) {
    const winningTrumps = hand.filter((c) => c.suit === trumpSuit && wouldWin(c));
    if (!partnerWinning && winningTrumps.length > 0 && trickPoints(trick) >= 3) {
      return { action: 'play', cardId: lowestBy(winningTrumps, cardPower).id };
    }
  }
  if (partnerWinning && (isLast || winner.card.rank === 'J')) {
    const nonTrump = hand.filter((c) => c.suit !== trumpSuit);
    return { action: 'play', cardId: feedCard(nonTrump.length ? nonTrump : hand).id };
  }
  // Discard as cheaply as possible, hanging on to trumps when we know them.
  const knowsTrump = state.trumpRevealed || isBidder;
  const nonTrump = hand.filter((c) => c.suit !== trumpSuit);
  const discardPool = knowsTrump && nonTrump.length > 0 ? nonTrump : hand;
  return { action: 'play', cardId: throwaway(discardPool).id };
}
