/**
 * Heuristic engine for the three automated players.
 *
 * The AI is information-honest: only the bidder "knows" the trump suit
 * before it is revealed, and no AI ever looks at another player's hand.
 * It does, however, remember everything that has legitimately been seen —
 * played cards and who showed out of which suit — via `buildMemory`.
 */
import {
  canGuessTrump,
  canRequestReveal,
  canSubmitHiddenTrump,
  effectiveTrump,
  GameState,
  isValidBid,
  minBidFor,
  BID_STEP,
  trumpSuitOf,
} from './engine';
import { currentWinner, isVoidInLedSuit, legalMoves, trickPoints } from './rules';
import {
  BLIND_RANKS,
  Card,
  Rank,
  RANK_POWER,
  RANKS,
  Seat,
  Suit,
  SUITS,
  cardPoints,
  cardPower,
  nextSeat,
  partnerOf,
  teamOf,
} from './types';

export type AiMove =
  | { action: 'reveal' }
  | { action: 'submitTrump' }
  | { action: 'play'; cardId: string }
  | { action: 'guess'; cardId: string };

// ---------------------------------------------------------------------------
// Card memory
// ---------------------------------------------------------------------------

export interface Memory {
  /** Ids of every card this seat has legitimately seen (plays + own hand). */
  seen: Set<string>;
  /** voids[seat][suit] — that seat has shown out of that suit. */
  voids: Record<Suit, boolean>[];
  /** The ranks actually in play this round (blind mode drops 7s and 8s). */
  ranks: Rank[];
}

/** Everything `seat` can legitimately know about the deal so far. */
export function buildMemory(state: GameState, seat: Seat): Memory {
  const seen = new Set<string>();
  const voids: Record<Suit, boolean>[] = [0, 1, 2, 3].map(() => ({
    S: false,
    H: false,
    D: false,
    C: false,
  }));
  for (const trick of [...state.trickHistory, state.currentTrick]) {
    if (trick.length === 0) continue;
    const ledSuit = trick[0].card.suit;
    for (const p of trick) {
      seen.add(p.card.id);
      if (p.card.suit !== ledSuit) voids[p.seat][ledSuit] = true;
    }
  }
  for (const c of state.hands[seat]) seen.add(c.id);
  if (state.trumpCard && (state.trumpRevealed || seat === state.bidder)) {
    seen.add(state.trumpCard.id);
  }
  return { seen, voids, ranks: state.mode === 'blind' ? BLIND_RANKS : RANKS };
}

/**
 * A card is "boss" when no unseen card of its suit outranks it — nobody
 * else can beat it in that suit (it may still fall to a trump).
 */
export function isBoss(card: Card, mem: Memory): boolean {
  return mem.ranks.every(
    (rank) =>
      RANK_POWER[rank] <= cardPower(card) || mem.seen.has(`${card.suit}-${rank}`),
  );
}

const unseenInSuit = (suit: Suit, mem: Memory): number =>
  mem.ranks.filter((rank) => !mem.seen.has(`${suit}-${rank}`)).length;

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------

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
  const need = state.highBid === null ? minBidFor(state.mode) : state.highBid + BID_STEP;
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

// ---------------------------------------------------------------------------
// Card play
// ---------------------------------------------------------------------------

const lowestBy = (cards: Card[], score: (c: Card) => number): Card =>
  cards.reduce((a, b) => (score(b) < score(a) ? b : a));

/** Cheapest card to give away: minimize points, avoid breaking up bosses. */
const throwaway = (cards: Card[], mem: Memory): Card =>
  lowestBy(cards, (c) => cardPoints(c) * 10 + cardPower(c) + (isBoss(c, mem) ? 60 : 0));

/** Highest-point card to feed to a winning partner (ties broken low). */
const feedCard = (cards: Card[]): Card =>
  lowestBy(cards, (c) => -(cardPoints(c) * 10) + cardPower(c));

const play = (card: Card): AiMove => ({ action: 'play', cardId: card.id });

/**
 * Playing AI. May return `{action:'reveal'}` (classic mode) or
 * `{action:'submitTrump'}` (blind mode, bidder only) when void in the led
 * suit and worth revealing for; the caller applies that and asks again for
 * the actual card. In blind mode, any other void play — including the
 * bidder's, when it doesn't want to reveal — is required to go as a
 * face-down guess instead (canGuessTrump), so this wraps the outcome of the
 * ordinary decision logic accordingly rather than choosing whether to
 * guess.
 */
export function choosePlay(state: GameState, seat: Seat): AiMove {
  const move = decidePlay(state, seat);
  if (move.action === 'play' && canGuessTrump(state, seat)) {
    return { action: 'guess', cardId: move.cardId };
  }
  return move;
}

function decidePlay(state: GameState, seat: Seat): AiMove {
  const hand = state.hands[seat];
  const trick = state.currentTrick;
  const legal = legalMoves(hand, trick);
  const trump = effectiveTrump(state); // null while concealed
  const trumpSuit = trumpSuitOf(state);
  const isBidder = seat === state.bidder;
  const knowsTrump = state.trumpRevealed || isBidder;
  const mem = buildMemory(state, seat);
  const partner = partnerOf(seat);

  // Seats still to play after us in this trick.
  const seatsYetToPlay: Seat[] = [];
  let s = nextSeat(seat);
  while (seatsYetToPlay.length < 3 - trick.length) {
    seatsYetToPlay.push(s);
    s = nextSeat(s);
  }
  const oppsYetToPlay = seatsYetToPlay.filter((p) => teamOf(p) !== teamOf(seat));
  const ledSuit = trick[0]?.card.suit ?? null;

  /** Could an opponent still to play beat this card if it were winning? */
  const beatableByOpponent = (card: Card): boolean => {
    if (oppsYetToPlay.length === 0) return false;
    const higherUnseen = RANKS.some(
      (rank) =>
        RANK_POWER[rank] > cardPower(card) && !mem.seen.has(`${card.suit}-${rank}`),
    );
    const suitThreat =
      higherUnseen && oppsYetToPlay.some((op) => !mem.voids[op][card.suit]);
    // Known-void opponents may ruff a non-trump winner once the trump is live.
    const trumpThreat =
      trump !== null &&
      card.suit !== trump &&
      ledSuit !== null &&
      oppsYetToPlay.some((op) => mem.voids[op][ledSuit] && !mem.voids[op][trump]);
    return suitThreat || trumpThreat;
  };

  // ---- Leading a trick ----------------------------------------------------
  if (trick.length === 0) {
    const groups = bySuit(hand);
    const bidderTeam = state.bidder !== null && teamOf(seat) === teamOf(state.bidder);

    // Draw trumps: with the trump out and the boss trump in hand, the
    // bidding side pulls the opponents' trumps before cashing side suits.
    if (trump && bidderTeam) {
      const trumps = groups[trump];
      const bossTrump = trumps.find((c) => isBoss(c, mem));
      if (bossTrump && unseenInSuit(trump, mem) > 0) return play(bossTrump);
    }

    // Cash a boss card, preferring point-heavy ones and suits that
    // opponents still have to follow (and cannot ruff).
    const bosses = hand.filter((c) => {
      if (!isBoss(c, mem)) return false;
      if (trump && c.suit !== trump) {
        const ruffable = oppsYetToPlay.some(
          (op) => mem.voids[op][c.suit] && !mem.voids[op][trump],
        );
        if (ruffable) return false;
      }
      return true;
    });
    if (bosses.length > 0) {
      return play(
        bosses.reduce((a, b) =>
          cardPoints(b) * 10 + unseenInSuit(b.suit, mem) >
          cardPoints(a) * 10 + unseenInSuit(a.suit, mem)
            ? b
            : a,
        ),
      );
    }

    // Probe: a cheap card from our longest suit, avoiding suits an
    // opponent is known to be void in (they would ruff or discard freely).
    const safeSuits = SUITS.filter(
      (suit) =>
        groups[suit].length > 0 &&
        !oppsYetToPlay.some((op) => mem.voids[op][suit] && (!trump || !mem.voids[op][trump])),
    );
    const pool =
      safeSuits.length > 0
        ? safeSuits.reduce((a, b) => (groups[b].length > groups[a].length ? b : a))
        : SUITS.filter((suit) => groups[suit].length > 0).reduce((a, b) =>
            groups[b].length > groups[a].length ? b : a,
          );
    return play(throwaway(groups[pool], mem));
  }

  // ---- Following to a trick -----------------------------------------------
  const winner = currentWinner(trick, trump)!;
  const partnerWinning = winner.seat === partner;
  const isLast = trick.length === 3;
  const trickPts = trickPoints(trick);
  const wouldWin = (card: Card): boolean =>
    currentWinner([...trick, { seat, card }], trump)!.seat === seat;

  const voidInLed = isVoidInLedSuit(hand, trick);

  // Consider a deliberate reveal when unable to follow suit: classic mode
  // lets any void seat request it; blind mode instead lets the bidder
  // submit the sequestered trump card as their play.
  if (voidInLed && canRequestReveal(state, seat)) {
    const groups = bySuit(hand);
    const wantsReveal = isBidder
      ? // The bidder knows the trump; reveal only when actually holding
        // trumps and there is something worth taking.
        hand.some((c) => c.suit === trumpSuit) &&
        (!partnerWinning || trickPts >= 20)
      : // Others gamble: reveal when holding strong cards (J, or a guarded 9)
        // in some suit, hoping it is — or can beat — the trump.
        !partnerWinning &&
        SUITS.some(
          (suit) =>
            groups[suit].some((c) => c.rank === 'J') ||
            (groups[suit].length >= 2 && groups[suit].some((c) => c.rank === '9')),
        );
    if (wantsReveal) return { action: 'reveal' };
  } else if (voidInLed && canSubmitHiddenTrump(state, seat)) {
    // Same reasoning as the bidder's classic-mode reveal above, since the
    // bidder always knows the trump: worth it only when holding trumps to
    // use and something worth taking.
    const wantsReveal = hand.some((c) => c.suit === trumpSuit) && (!partnerWinning || trickPts >= 20);
    if (wantsReveal) return { action: 'submitTrump' };
  }

  const partnerSecure = partnerWinning && !beatableByOpponent(winner.card);

  if (!voidInLed) {
    if (partnerSecure) {
      // Feed points (10s, Aces...) to a partner who has the trick locked up.
      return play(feedCard(legal));
    }
    const winning = legal.filter(wouldWin);
    if (winning.length > 0 && !partnerWinning) {
      // Win with a boss that sticks — bank its points too — else win cheap.
      const sticky = winning.filter((c) => !beatableByOpponent(c));
      if (sticky.length > 0) return play(feedCard(sticky));
      const cheap = lowestBy(winning, cardPower);
      if (isLast || trickPts >= 10 || cardPoints(cheap) === 0) return play(cheap);
    }
    return play(throwaway(legal, mem));
  }

  // ---- Void in the led suit -----------------------------------------------
  if (trump && trumpSuit) {
    const winningTrumps = hand.filter((c) => c.suit === trumpSuit && wouldWin(c));
    if (!partnerWinning && winningTrumps.length > 0 && (trickPts >= 3 || isLast)) {
      return play(lowestBy(winningTrumps, cardPower));
    }
  }
  if (partnerSecure) {
    const nonTrump = hand.filter((c) => c.suit !== trumpSuit);
    return play(feedCard(nonTrump.length > 0 ? nonTrump : hand));
  }
  // Discard as cheaply as possible, hanging on to trumps when we know them.
  const nonTrump = hand.filter((c) => c.suit !== trumpSuit);
  const discardPool = knowsTrump && nonTrump.length > 0 ? nonTrump : hand;
  return play(throwaway(discardPool, mem));
}
