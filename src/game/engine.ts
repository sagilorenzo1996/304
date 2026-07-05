/**
 * Pure game engine for 304. Every transition takes a state and returns a new
 * state (the input is never mutated), which makes the engine trivial to use
 * inside a React reducer and to unit-test headlessly.
 */
import { buildDeck, Rng, shuffle } from './deck';
import { legalMoves, isVoidInLedSuit, PlayedCard, trickPoints, trickWinner } from './rules';
import { Card, Seat, SEAT_NAMES, Suit, Team, nextSeat, teamOf } from './types';

export type Phase = 'bidding' | 'trumpSelection' | 'playing' | 'roundEnd';

/**
 * classic — trump stays concealed; any void player may request the reveal.
 * blind   — nobody may request a reveal, not even the bidder. Any void
 *           seat must instead submit a face-down guess (see canGuessTrump)
 *           rather than an ordinary open play, or wait for the forced
 *           reveal on the last trick.
 * open    — trump is revealed to everyone the instant it is set.
 */
export type GameMode = 'classic' | 'blind' | 'open';

export const GAME_MODES: { id: GameMode; label: string; description: string }[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Trump stays hidden until a player void in the led suit asks for it.',
  },
  {
    id: 'blind',
    label: 'Blind',
    description:
      'Nobody may request the trump reveal. Anyone void in the led suit — including the bidder — must play a card face-down; it reveals the trump if it matches, or stays hidden forever if it doesn’t.',
  },
  {
    id: 'open',
    label: 'Open',
    description: 'Trump is revealed to everyone the moment the bidder sets it.',
  },
];

export const MIN_BID = 200;
export const MAX_BID = 304;
export const BID_STEP = 10;

export interface BidEntry {
  seat: Seat;
  bid: number | null; // null = pass
}

export interface RoundResult {
  bidder: Seat;
  bidderTeam: Team;
  bid: number;
  bidderTeamPoints: number;
  defenderTeamPoints: number;
  success: boolean;
}

export interface GameState {
  phase: Phase;
  mode: GameMode;
  round: number;
  dealer: Seat;
  hands: Card[][]; // indexed by seat
  pending: Card[]; // the 16 cards held back for the second deal

  // Bidding
  passed: boolean[];
  bidHistory: BidEntry[];
  highBid: number | null;
  highBidder: Seat | null;
  bidTurn: Seat;
  bidder: Seat | null;
  bid: number | null;

  // Trump
  trumpCard: Card | null; // the concealed indicator card
  trumpRevealed: boolean;
  revealSeat: Seat | null;

  // Trick play
  leader: Seat;
  turn: Seat;
  currentTrick: PlayedCard[];
  trickComplete: boolean;
  trickWinnerSeat: Seat | null;
  tricksPlayed: number;
  trickHistory: PlayedCard[][]; // completed tricks, in play order

  // Scoring
  teamPoints: [number, number]; // card points captured this round [NS, EW]
  matchWins: [number, number]; // rounds won [NS, EW]
  roundResult: RoundResult | null;

  message: string;
}

export function trumpSuitOf(state: GameState): Suit | null {
  return state.trumpCard?.suit ?? null;
}

/** Trump suit as usable in trick evaluation (null while still concealed). */
export function effectiveTrump(state: GameState): Suit | null {
  return state.trumpRevealed ? trumpSuitOf(state) : null;
}

/** Deal the first 4 cards to each player and open the bidding. */
export function createRound(
  dealer: Seat,
  matchWins: [number, number],
  round: number,
  rng: Rng = Math.random,
  mode: GameMode = 'classic',
): GameState {
  const deck = shuffle(buildDeck(), rng);
  const hands: Card[][] = [[], [], [], []];
  let seat = nextSeat(dealer);
  for (let i = 0; i < 4; i++) {
    hands[seat] = deck.slice(i * 4, i * 4 + 4);
    seat = nextSeat(seat);
  }
  const firstToBid = nextSeat(dealer);
  return {
    phase: 'bidding',
    mode,
    round,
    dealer,
    hands,
    pending: deck.slice(16),
    passed: [false, false, false, false],
    bidHistory: [],
    highBid: null,
    highBidder: null,
    bidTurn: firstToBid,
    bidder: null,
    bid: null,
    trumpCard: null,
    trumpRevealed: false,
    revealSeat: null,
    leader: firstToBid,
    turn: firstToBid,
    currentTrick: [],
    trickComplete: false,
    trickWinnerSeat: null,
    tricksPlayed: 0,
    trickHistory: [],
    teamPoints: [0, 0],
    matchWins,
    roundResult: null,
    message: `Round ${round} — ${SEAT_NAMES[dealer]} deals. Bidding opens at ${MIN_BID}.`,
  };
}

export function isValidBid(state: GameState, bid: number): boolean {
  if (bid < MIN_BID || bid > MAX_BID) return false;
  if (bid % BID_STEP !== 0 && bid !== MAX_BID) return false;
  return state.highBid === null ? true : bid > state.highBid;
}

/**
 * Register a bid (`bid` is a number) or a pass (`bid` is null).
 * A player who passes is out of the auction for good. If all four players
 * pass, the hand is thrown in and redealt by the same dealer.
 */
export function placeBid(
  state: GameState,
  seat: Seat,
  bid: number | null,
  rng: Rng = Math.random,
): GameState {
  if (state.phase !== 'bidding') throw new Error('Not in the bidding phase');
  if (seat !== state.bidTurn) throw new Error(`It is not seat ${seat}'s turn to bid`);
  if (state.passed[seat]) throw new Error('That player has already passed');

  const s = structuredClone(state);
  if (bid === null) {
    s.passed[seat] = true;
    s.message = `${SEAT_NAMES[seat]} passes.`;
  } else {
    if (!isValidBid(state, bid)) throw new Error(`Invalid bid: ${bid}`);
    s.highBid = bid;
    s.highBidder = seat;
    s.message = `${SEAT_NAMES[seat]} bids ${bid}.`;
  }
  s.bidHistory.push({ seat, bid });

  const active = ([0, 1, 2, 3] as Seat[]).filter((p) => !s.passed[p]);
  if (active.length === 0) {
    const redeal = createRound(state.dealer, state.matchWins, state.round, rng, state.mode);
    redeal.message = 'Everyone passed — the hand is thrown in and redealt.';
    return redeal;
  }
  if (active.length === 1 && s.highBidder === active[0]) {
    s.bidder = s.highBidder;
    s.bid = s.highBid;
    s.phase = 'trumpSelection';
    s.message = `${SEAT_NAMES[s.bidder]} wins the auction at ${s.bid} and now sets the trump.`;
    return s;
  }
  let next = nextSeat(seat);
  while (s.passed[next]) next = nextSeat(next);
  s.bidTurn = next;
  return s;
}

/**
 * The auction winner places one card from their hand face down; its suit is
 * the (secret) trump. The remaining 16 cards are then dealt out and play
 * starts with the player left of the dealer.
 */
export function selectTrump(state: GameState, cardId: string): GameState {
  if (state.phase !== 'trumpSelection') throw new Error('Not in the trump-selection phase');
  if (state.bidder === null) throw new Error('No bidder');

  const s = structuredClone(state);
  const bidder = s.bidder as Seat;
  const hand = s.hands[bidder];
  const idx = hand.findIndex((c: Card) => c.id === cardId);
  if (idx === -1) throw new Error('Trump card must come from the bidder’s hand');
  [s.trumpCard] = hand.splice(idx, 1);

  // Second deal: 4 more cards each, starting left of the dealer.
  let seat = nextSeat(s.dealer);
  for (let i = 0; i < 4; i++) {
    s.hands[seat].push(...s.pending.slice(i * 4, i * 4 + 4));
    seat = nextSeat(seat);
  }
  s.pending = [];

  s.phase = 'playing';
  s.leader = nextSeat(s.dealer);
  s.turn = s.leader;

  if (s.mode === 'open') {
    doReveal(s, bidder);
    s.message = `${SEAT_NAMES[bidder]} sets the trump — it is ${suitWord(
      s.trumpCard!.suit,
    )}! ${SEAT_NAMES[s.leader]} leads.`;
  } else {
    s.message = `${SEAT_NAMES[bidder]} placed the trump face down. ${SEAT_NAMES[s.leader]} leads.`;
  }
  return s;
}

/**
 * A player may ask for the trump to be revealed only when unable to follow
 * suit. In "blind" mode this is never allowed, not even for the bidder —
 * the only way to reveal early is a face-down guess (see canGuessTrump),
 * or the forced reveal on the last trick.
 */
export function canRequestReveal(state: GameState, seat: Seat): boolean {
  return (
    state.mode !== 'blind' &&
    state.phase === 'playing' &&
    !state.trickComplete &&
    !state.trumpRevealed &&
    state.turn === seat &&
    state.currentTrick.length > 0 &&
    isVoidInLedSuit(state.hands[seat], state.currentTrick)
  );
}

/** Flip the concealed trump card face up and return it to the bidder's hand. */
export function requestReveal(state: GameState, seat: Seat): GameState {
  if (!canRequestReveal(state, seat)) throw new Error('Trump reveal is not allowed right now');
  return doReveal(structuredClone(state), seat);
}

function doReveal(s: GameState, seat: Seat): GameState {
  s.trumpRevealed = true;
  s.revealSeat = seat;
  if (s.bidder !== null && s.trumpCard) {
    s.hands[s.bidder].push(s.trumpCard);
  }
  s.message = `${SEAT_NAMES[seat]} asks for the trump — it is ${suitWord(s.trumpCard!.suit)}!`;
  return s;
}

/**
 * The bidder plays with 7 cards while the trump stays hidden. If their hand
 * runs empty before the reveal (the last trick), the trump is flipped
 * automatically so the concealed card can be played.
 */
function autoRevealIfStuck(s: GameState): GameState {
  if (
    s.phase === 'playing' &&
    !s.trickComplete &&
    !s.trumpRevealed &&
    s.bidder !== null &&
    s.turn === s.bidder &&
    s.hands[s.bidder].length === 0 &&
    s.trumpCard
  ) {
    doReveal(s, s.bidder);
    s.message = `The trump is revealed automatically — it was ${suitWord(s.trumpCard!.suit)}.`;
  }
  return s;
}

/**
 * In blind mode, a void seat — including the bidder — must play its card
 * face-down instead of an ordinary open play (see the mandatory check in
 * `playCard`). If the card's suit matches the trump, it is revealed to the
 * whole table; if not, the card still resolves the trick normally but its
 * face stays concealed from everyone else for the rest of the game. The
 * bidder already knows the suit, so for them this is how they choose to
 * reveal early; everyone else is genuinely guessing.
 */
export function canGuessTrump(state: GameState, seat: Seat): boolean {
  return (
    state.mode === 'blind' &&
    state.phase === 'playing' &&
    !state.trickComplete &&
    !state.trumpRevealed &&
    state.turn === seat &&
    state.currentTrick.length > 0 &&
    isVoidInLedSuit(state.hands[seat], state.currentTrick)
  );
}

export function playCard(state: GameState, seat: Seat, cardId: string, guess = false): GameState {
  if (state.phase !== 'playing') throw new Error('Not in the playing phase');
  if (state.trickComplete) throw new Error('The finished trick must be collected first');
  if (seat !== state.turn) throw new Error(`It is not seat ${seat}'s turn`);
  if (guess && !canGuessTrump(state, seat)) {
    throw new Error('Cannot play a hidden trump guess right now');
  }
  if (!guess && canGuessTrump(state, seat)) {
    throw new Error('Void in blind mode before the reveal: the card must be played face-down');
  }

  const s = structuredClone(state);
  const hand = s.hands[seat];
  const card = hand.find((c) => c.id === cardId);
  if (!card) throw new Error('Card is not in hand');
  if (!legalMoves(hand, s.currentTrick).some((c) => c.id === cardId)) {
    throw new Error('You must follow the led suit');
  }

  s.hands[seat] = hand.filter((c) => c.id !== cardId);
  const guessedTrump = guess && card.suit === trumpSuitOf(s);
  s.currentTrick.push({ seat, card, concealed: guess && !guessedTrump });

  if (guessedTrump) {
    doReveal(s, seat);
    s.message = `${SEAT_NAMES[seat]}’s hidden card exposes the trump — it is ${suitWord(
      s.trumpCard!.suit,
    )}!`;
  }

  if (s.currentTrick.length === 4) {
    s.trickComplete = true;
    s.trickWinnerSeat = trickWinner(s.currentTrick, effectiveTrump(s));
    const pts = trickPoints(s.currentTrick);
    const trickMsg = `${SEAT_NAMES[s.trickWinnerSeat]} takes the trick (+${pts} points).`;
    s.message = guessedTrump ? `${s.message} ${trickMsg}` : trickMsg;
    return s;
  }
  s.turn = nextSeat(seat);
  return autoRevealIfStuck(s);
}

/** Sweep the finished trick to the winner and either continue or score the round. */
export function collectTrick(state: GameState): GameState {
  if (!state.trickComplete || state.trickWinnerSeat === null) {
    throw new Error('No finished trick to collect');
  }
  const s = structuredClone(state);
  const winner = s.trickWinnerSeat as Seat;
  s.teamPoints[teamOf(winner)] += trickPoints(s.currentTrick);
  s.trickHistory.push(s.currentTrick);
  s.currentTrick = [];
  s.trickComplete = false;
  s.trickWinnerSeat = null;
  s.tricksPlayed += 1;
  s.leader = winner;
  s.turn = winner;

  if (s.tricksPlayed === 8) {
    const bidderTeam = teamOf(s.bidder as Seat);
    const bidderTeamPoints = s.teamPoints[bidderTeam];
    const success = bidderTeamPoints >= (s.bid as number);
    s.roundResult = {
      bidder: s.bidder as Seat,
      bidderTeam,
      bid: s.bid as number,
      bidderTeamPoints,
      defenderTeamPoints: s.teamPoints[bidderTeam === 0 ? 1 : 0],
      success,
    };
    s.matchWins[success ? bidderTeam : ((1 - bidderTeam) as Team)] += 1;
    s.phase = 'roundEnd';
    s.message = success
      ? `Bid made! The bidding team took ${bidderTeamPoints} of ${s.bid}.`
      : `Bid failed — the bidding team took only ${bidderTeamPoints} of ${s.bid}.`;
    return s;
  }
  s.message = `${SEAT_NAMES[winner]} leads the next trick.`;
  return autoRevealIfStuck(s);
}

export function nextRound(state: GameState, rng: Rng = Math.random): GameState {
  if (state.phase !== 'roundEnd') throw new Error('The round is not over yet');
  return createRound(nextSeat(state.dealer), state.matchWins, state.round + 1, rng, state.mode);
}

function suitWord(suit: Suit): string {
  return { S: '♠ Spades', H: '♥ Hearts', D: '♦ Diamonds', C: '♣ Clubs' }[suit];
}
