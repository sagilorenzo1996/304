import { Card, Seat, Suit, cardPoints, cardPower } from './types';

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

/**
 * The card currently winning the (possibly incomplete) trick.
 *
 * Pass `trumpSuit` only when the trump has been revealed. House rule: the
 * trump applies to the entire trick in which it is revealed, so evaluation
 * only ever needs the "is it revealed right now" flag.
 */
export function currentWinner(trick: PlayedCard[], trumpSuit: Suit | null): PlayedCard | null {
  if (trick.length === 0) return null;
  const ledSuit = trick[0].card.suit;
  const trumps = trumpSuit ? trick.filter((p) => p.card.suit === trumpSuit) : [];
  const pool = trumps.length > 0 ? trumps : trick.filter((p) => p.card.suit === ledSuit);
  return pool.reduce((best, p) => (cardPower(p.card) > cardPower(best.card) ? p : best));
}

export function trickWinner(trick: PlayedCard[], trumpSuit: Suit | null): Seat {
  const winner = currentWinner(trick, trumpSuit);
  if (!winner) throw new Error('Cannot evaluate an empty trick');
  return winner.seat;
}

export function trickPoints(trick: PlayedCard[]): number {
  return trick.reduce((sum, p) => sum + cardPoints(p.card), 0);
}

/**
 * Cards a player may legally play: must follow the led suit when possible,
 * otherwise any card. Trumping is allowed but never forced (house rule).
 */
export function legalMoves(hand: Card[], trick: PlayedCard[]): Card[] {
  if (trick.length === 0) return [...hand];
  const ledSuit = trick[0].card.suit;
  const followers = hand.filter((c) => c.suit === ledSuit);
  return followers.length > 0 ? followers : [...hand];
}

/** True if the seat holds no card of the currently led suit. */
export function isVoidInLedSuit(hand: Card[], trick: PlayedCard[]): boolean {
  if (trick.length === 0) return false;
  const ledSuit = trick[0].card.suit;
  return hand.every((c) => c.suit !== ledSuit);
}
