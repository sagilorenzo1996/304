/** Core shared types and constants for the 304 card game. */

export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export type Rank = 'J' | '9' | 'A' | '10' | 'K' | 'Q' | '8' | '7';

/** Ranks in descending order of trick-taking power (J is highest in 304). */
export const RANKS: Rank[] = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

/** Blind mode drops the two 0-point ranks: a 24-card deck, 6 cards a hand. */
export const BLIND_RANKS: Rank[] = RANKS.filter((rank) => rank !== '8' && rank !== '7');

/** Card point values. 8 cards x 4 suits => (30+20+11+10+3+2+0+0) * 4 = 304. */
export const CARD_POINTS: Record<Rank, number> = {
  J: 30,
  '9': 20,
  A: 11,
  '10': 10,
  K: 3,
  Q: 2,
  '8': 0,
  '7': 0,
};

/** Higher power beats lower power within the same suit. */
export const RANK_POWER: Record<Rank, number> = {
  J: 7,
  '9': 6,
  A: 5,
  '10': 4,
  K: 3,
  Q: 2,
  '8': 1,
  '7': 0,
};

export interface Card {
  id: string; // e.g. "S-J"
  suit: Suit;
  rank: Rank;
}

/** 0 = South (human), 1 = West, 2 = North (human's partner), 3 = East. */
export type Seat = 0 | 1 | 2 | 3;
export const SEATS: Seat[] = [0, 1, 2, 3];

/** Team 0 = North/South, Team 1 = East/West. */
export type Team = 0 | 1;

export const teamOf = (seat: Seat): Team => (seat % 2 === 0 ? 0 : 1);
export const nextSeat = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;
export const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;

export const cardPoints = (card: Card): number => CARD_POINTS[card.rank];
export const cardPower = (card: Card): number => RANK_POWER[card.rank];
