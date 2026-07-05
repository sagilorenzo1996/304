/**
 * Pure game engine for 304. Every transition takes a state and returns a new
 * state (the input is never mutated), which makes the engine trivial to use
 * inside a React reducer and to unit-test headlessly.
 */
import { buildDeck, Rng, shuffle } from './deck';
import { randomPlayerNames } from './names';
import { legalMoves, isVoidInLedSuit, PlayedCard, trickPoints, trickWinner } from './rules';
import { BLIND_RANKS, Card, Seat, Suit, Team, nextSeat, teamOf } from './types';

export type Phase = 'bidding' | 'trumpSelection' | 'playing' | 'roundEnd';

/**
 * classic — trump stays concealed; any void player may request the reveal.
 * blind   — nobody may request a reveal. Any void seat must instead play
 *           its card face-down (see canGuessTrump) rather than an ordinary
 *           open play; the bidder alone also has the option to submit the
 *           sequestered trump card itself (see canSubmitHiddenTrump) as a
 *           deliberate early reveal. Either way, a reveal only becomes
 *           known once the trick it happened in is fully resolved, so
 *           nobody still to act in that trick gets early information.
 * open    — trump is revealed to everyone the instant it is set.
 */
export type GameMode = 'classic' | 'blind' | 'open';

/** Mode ids in menu order; labels and descriptions live in the i18n dictionary. */
export const GAME_MODES: GameMode[] = ['classic', 'blind', 'open'];

export const MIN_BID = 200;
export const MAX_BID = 304;
export const BID_STEP = 10;

/** Blind mode's stripped 24-card deck holds fewer points to fight over, so it opens lower. */
const MIN_BID_BY_MODE: Record<GameMode, number> = { classic: MIN_BID, open: MIN_BID, blind: 180 };

export function minBidFor(mode: GameMode): number {
  return MIN_BID_BY_MODE[mode];
}

/** Cards dealt per player in each of the two deals (doubled for the full hand size). */
const DEAL_CHUNK: Record<GameMode, number> = { classic: 4, open: 4, blind: 3 };

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

/**
 * A translatable fragment of a game message: a dictionary key (see
 * src/i18n/translations.ts, `msg.*`) plus the values to interpolate into
 * it. Keeping messages structured — instead of baking English text in here
 * — is what lets the UI render them in whichever language is active.
 */
export interface MessagePart {
  key: string;
  params?: Record<string, string | number>;
}

/** One or more parts joined (by the UI) into the full status line. */
export type EngineMessage = MessagePart[];

export interface GameState {
  phase: Phase;
  mode: GameMode;
  round: number;
  dealer: Seat;
  hands: Card[][]; // indexed by seat
  pending: Card[]; // the 16 cards held back for the second deal
  /** Display names, randomized once per match and carried through every round. */
  playerNames: Record<Seat, string>;

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
  /** Seats whose face-down play this trick will expose the trump once the trick ends. */
  pendingReveals: Seat[];

  // Trick play
  leader: Seat;
  turn: Seat;
  currentTrick: PlayedCard[];
  trickComplete: boolean;
  trickWinnerSeat: Seat | null;
  tricksPlayed: number;
  totalTricks: number; // 8 normally, 6 in blind mode's stripped deck
  trickHistory: PlayedCard[][]; // completed tricks, in play order

  // Scoring
  teamPoints: [number, number]; // card points captured this round [NS, EW]
  matchWins: [number, number]; // rounds won [NS, EW]
  roundResult: RoundResult | null;

  message: EngineMessage;
}

export function trumpSuitOf(state: GameState): Suit | null {
  return state.trumpCard?.suit ?? null;
}

/** Trump suit as usable in trick evaluation (null while still concealed). */
export function effectiveTrump(state: GameState): Suit | null {
  return state.trumpRevealed ? trumpSuitOf(state) : null;
}

/**
 * Deal the first cards to each player and open the bidding — 4 each from
 * the full 32-card deck normally, or 3 each from blind mode's stripped
 * 24-card deck (no 7s or 8s).
 *
 * `playerNames` defaults to a fresh random draw (seat 0 is always "You");
 * pass the previous round's `state.playerNames` through on a redeal or
 * `nextRound` so the same opponents keep their names for the whole match.
 */
export function createRound(
  dealer: Seat,
  matchWins: [number, number],
  round: number,
  rng: Rng = Math.random,
  mode: GameMode = 'classic',
  playerNames: Record<Seat, string> = randomPlayerNames(rng),
): GameState {
  const chunk = DEAL_CHUNK[mode];
  const deck = shuffle(mode === 'blind' ? buildDeck(BLIND_RANKS) : buildDeck(), rng);
  const hands: Card[][] = [[], [], [], []];
  let seat = nextSeat(dealer);
  for (let i = 0; i < 4; i++) {
    hands[seat] = deck.slice(i * chunk, i * chunk + chunk);
    seat = nextSeat(seat);
  }
  const firstToBid = nextSeat(dealer);
  return {
    phase: 'bidding',
    mode,
    round,
    dealer,
    hands,
    pending: deck.slice(4 * chunk),
    playerNames,
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
    pendingReveals: [],
    leader: firstToBid,
    turn: firstToBid,
    currentTrick: [],
    trickComplete: false,
    trickWinnerSeat: null,
    tricksPlayed: 0,
    totalTricks: chunk * 2,
    trickHistory: [],
    teamPoints: [0, 0],
    matchWins,
    roundResult: null,
    message: [
      { key: 'msg.roundDeals', params: { round, name: playerNames[dealer], minBid: minBidFor(mode) } },
    ],
  };
}

export function isValidBid(state: GameState, bid: number): boolean {
  if (bid < minBidFor(state.mode) || bid > MAX_BID) return false;
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
    s.message = [{ key: 'msg.passes', params: { name: s.playerNames[seat] } }];
  } else {
    if (!isValidBid(state, bid)) throw new Error(`Invalid bid: ${bid}`);
    s.highBid = bid;
    s.highBidder = seat;
    s.message = [{ key: 'msg.bids', params: { name: s.playerNames[seat], bid } }];
  }
  s.bidHistory.push({ seat, bid });

  const active = ([0, 1, 2, 3] as Seat[]).filter((p) => !s.passed[p]);
  if (active.length === 0) {
    const redeal = createRound(
      state.dealer,
      state.matchWins,
      state.round,
      rng,
      state.mode,
      state.playerNames,
    );
    redeal.message = [{ key: 'msg.redeal' }];
    return redeal;
  }
  if (active.length === 1 && s.highBidder === active[0]) {
    s.bidder = s.highBidder;
    s.bid = s.highBid;
    s.phase = 'trumpSelection';
    s.message = [
      { key: 'msg.auctionWon', params: { name: s.playerNames[s.bidder], bid: s.bid as number } },
    ];
    return s;
  }
  let next = nextSeat(seat);
  while (s.passed[next]) next = nextSeat(next);
  s.bidTurn = next;
  return s;
}

/**
 * The auction winner places one card from their hand face down; its suit is
 * the (secret) trump. The remaining held-back cards are then dealt out and
 * play starts with the player left of the dealer.
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

  // Second deal: the same chunk size again, starting left of the dealer.
  const chunk = DEAL_CHUNK[s.mode];
  let seat = nextSeat(s.dealer);
  for (let i = 0; i < 4; i++) {
    s.hands[seat].push(...s.pending.slice(i * chunk, i * chunk + chunk));
    seat = nextSeat(seat);
  }
  s.pending = [];

  s.phase = 'playing';
  s.leader = nextSeat(s.dealer);
  s.turn = s.leader;

  if (s.mode === 'open') {
    doReveal(s, bidder);
    s.message = [
      {
        key: 'msg.trumpSetOpen',
        params: { name: s.playerNames[bidder], suit: s.trumpCard!.suit, leader: s.playerNames[s.leader] },
      },
    ];
  } else {
    s.message = [
      {
        key: 'msg.trumpSetHidden',
        params: { name: s.playerNames[bidder], leader: s.playerNames[s.leader] },
      },
    ];
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
  const s = doReveal(structuredClone(state), seat);
  s.message = [
    { key: 'msg.trumpAsked', params: { name: s.playerNames[seat], suit: s.trumpCard!.suit } },
  ];
  return s;
}

/**
 * Flip the trump face up. `consumesTrumpCard` is true when the card that
 * triggered this reveal *is* the sequestered trump card itself (see
 * `submitHiddenTrump`) — in that case it has already been played into the
 * trick, so it must not also be returned to the bidder's hand.
 */
function doReveal(s: GameState, seat: Seat, consumesTrumpCard = false): GameState {
  s.trumpRevealed = true;
  s.revealSeat = seat;
  if (!consumesTrumpCard && s.bidder !== null && s.trumpCard) {
    s.hands[s.bidder].push(s.trumpCard);
  }
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
    s.message = [{ key: 'msg.trumpAutoRevealed', params: { suit: s.trumpCard!.suit } }];
  }
  return s;
}

/**
 * In blind mode, a void seat must play its card face-down instead of an
 * ordinary open play (see the mandatory check in `playCard`). If the
 * card's suit matches the trump, it is revealed; if not, the card still
 * resolves the trick normally but its face stays concealed from everyone
 * else for the rest of the game. This is a genuine guess for everyone —
 * including the bidder, whose own hand cards never expose the trump this
 * way even when they happen to share its suit (see `playCard`); the
 * bidder's deliberate reveal is `submitHiddenTrump` instead. A reveal
 * triggered here is only announced once the trick it happened in ends
 * (see `finishTrick`), so nobody still to act in that trick learns early.
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

/**
 * Only the bidder, and only in blind mode, may submit the sequestered
 * trump card itself in place of a hand card while void — a deliberate
 * early reveal, as opposed to playing an ordinary hand card face-down
 * (see canGuessTrump), which never reveals anything for the bidder no
 * matter its suit.
 */
export function canSubmitHiddenTrump(state: GameState, seat: Seat): boolean {
  return state.bidder === seat && canGuessTrump(state, seat);
}

/**
 * The bidder plays their sequestered trump card directly, without it ever
 * passing through their hand. This always exposes the trump — but, like
 * every reveal in blind mode, only once the trick it happened in ends.
 */
export function submitHiddenTrump(state: GameState, seat: Seat): GameState {
  if (!canSubmitHiddenTrump(state, seat)) {
    throw new Error('Cannot submit the hidden trump right now');
  }
  const s = structuredClone(state);
  const card = s.trumpCard as Card;
  s.currentTrick.push({ seat, card, concealed: true });
  s.pendingReveals.push(seat);
  return finishTrick(s, seat);
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
  // The bidder already knows the trump, so their own hand cards never
  // count as a guess-hit — only submitHiddenTrump reveals for them.
  const guessedTrump = guess && seat !== s.bidder && card.suit === trumpSuitOf(s);
  s.currentTrick.push({ seat, card, concealed: guess });
  if (guessedTrump) s.pendingReveals.push(seat);

  return finishTrick(s, seat);
}

/**
 * Complete the trick if this was its fourth card — applying any reveals
 * earned this trick only now, so they were never visible to a seat still
 * to act in the same trick — or hand off to the next seat.
 */
function finishTrick(s: GameState, seat: Seat): GameState {
  if (s.currentTrick.length === 4) {
    const revealMessages: MessagePart[] = [];
    if (s.pendingReveals.length > 0) {
      // Only true when the bidder's own submitted trump card is what
      // triggered the reveal — it's already in the trick and must not
      // also be pushed back into their hand.
      const trumpAlreadyPlayed = s.currentTrick.some((p) => p.card.id === s.trumpCard?.id);
      for (const revealer of s.pendingReveals) {
        const entry = s.currentTrick.find((p) => p.seat === revealer);
        if (entry) entry.concealed = false;
        doReveal(s, revealer, trumpAlreadyPlayed);
        revealMessages.push({
          key: 'msg.hiddenCardExposesTrump',
          params: { name: s.playerNames[revealer], suit: s.trumpCard!.suit },
        });
      }
      s.pendingReveals = [];
    }
    s.trickComplete = true;
    s.trickWinnerSeat = trickWinner(s.currentTrick, effectiveTrump(s));
    const pts = trickPoints(s.currentTrick);
    s.message = [
      ...revealMessages,
      { key: 'msg.takesTrick', params: { name: s.playerNames[s.trickWinnerSeat], points: pts } },
    ];
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

  if (s.tricksPlayed === s.totalTricks) {
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
    s.message = [
      {
        key: success ? 'msg.bidMade' : 'msg.bidFailed',
        params: { points: bidderTeamPoints, bid: s.bid as number },
      },
    ];
    return s;
  }
  s.message = [{ key: 'msg.leadsNextTrick', params: { name: s.playerNames[winner] } }];
  return autoRevealIfStuck(s);
}

export function nextRound(state: GameState, rng: Rng = Math.random): GameState {
  if (state.phase !== 'roundEnd') throw new Error('The round is not over yet');
  return createRound(
    nextSeat(state.dealer),
    state.matchWins,
    state.round + 1,
    rng,
    state.mode,
    state.playerNames,
  );
}
