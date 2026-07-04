import { canRequestReveal, GameState } from '../game/engine';
import { legalMoves } from '../game/rules';
import { Card, Seat, SEAT_NAMES, cardPower } from '../game/types';
import { HUMAN } from '../hooks/useGame';
import CardView, { isRedSuit, suitChar } from './CardView';
import TrickArea from './TrickArea';

interface Props {
  state: GameState;
  onPlayCard: (cardId: string) => void;
  onRequestReveal: () => void;
}

/** Sort for display: alternate suit colors, highest rank first within a suit. */
function sortHand(hand: Card[]): Card[] {
  const order = ['S', 'H', 'C', 'D'];
  return [...hand].sort((a, b) => {
    const suitDiff = order.indexOf(a.suit) - order.indexOf(b.suit);
    return suitDiff !== 0 ? suitDiff : cardPower(b) - cardPower(a);
  });
}

function lastBidLabel(state: GameState, seat: Seat): string | null {
  if (state.phase !== 'bidding' && state.phase !== 'trumpSelection') return null;
  for (let i = state.bidHistory.length - 1; i >= 0; i--) {
    const entry = state.bidHistory[i];
    if (entry.seat === seat) return entry.bid === null ? 'Pass' : `${entry.bid}`;
  }
  return null;
}

export default function Table({ state, onPlayCard, onRequestReveal }: Props) {
  const humanTurn =
    state.phase === 'playing' && state.turn === HUMAN && !state.trickComplete;
  const legalIds = humanTurn
    ? new Set(legalMoves(state.hands[HUMAN], state.currentTrick).map((c) => c.id))
    : new Set<string>();
  const showReveal = canRequestReveal(state, HUMAN);

  const activeSeat =
    state.phase === 'bidding'
      ? state.bidTurn
      : state.phase === 'playing' && !state.trickComplete
        ? state.turn
        : null;

  const seatPlate = (seat: Seat) => {
    const bidLabel = lastBidLabel(state, seat);
    return (
      <div className={`plate ${activeSeat === seat ? 'active' : ''}`}>
        <span className="plate-name">
          {SEAT_NAMES[seat]}
          {seat === 2 && <em> · partner</em>}
        </span>
        {state.dealer === seat && <span className="chip dealer">D</span>}
        {state.bidder === seat && state.bid !== null && (
          <span className="chip bid-chip">{state.bid}</span>
        )}
        {bidLabel && state.bidder === null && <span className="chip">{bidLabel}</span>}
        {state.bidder === seat && !state.trumpRevealed && state.trumpCard && (
          <CardView faceDown small className="trump-indicator" />
        )}
      </div>
    );
  };

  const aiHand = (seat: Seat) => (
    <div className="ai-cards">
      {state.hands[seat].map((c, i) => (
        <CardView key={c.id} faceDown small style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );

  return (
    <div className="table">
      <div className="felt" />

      <div className="seat seat-north">
        {seatPlate(2)}
        {aiHand(2)}
      </div>
      <div className="seat seat-west">
        {seatPlate(1)}
        {aiHand(1)}
      </div>
      <div className="seat seat-east">
        {seatPlate(3)}
        {aiHand(3)}
      </div>

      <TrickArea state={state} />

      <div className="message-bar">{state.message}</div>

      <div className="seat seat-south">
        {showReveal && (
          <button className="reveal-btn" onClick={onRequestReveal}>
            Reveal Trump 🂠
          </button>
        )}
        <div className="hand">
          {sortHand(state.hands[HUMAN]).map((c, i) => (
            <CardView
              key={c.id}
              card={c}
              disabled={humanTurn && !legalIds.has(c.id)}
              onClick={humanTurn && legalIds.has(c.id) ? () => onPlayCard(c.id) : undefined}
              className={humanTurn && legalIds.has(c.id) ? 'playable' : ''}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        {seatPlate(0)}
        {state.bidder === HUMAN && state.trumpCard && !state.trumpRevealed && (
          <div className="secret-trump">
            Your secret trump: {state.trumpCard.rank}
            {suitChar(state.trumpCard.suit)}
          </div>
        )}
      </div>

      {state.trumpRevealed && state.trumpCard && (
        <div className="trump-banner">
          Trump:{' '}
          <b className={isRedSuit(state.trumpCard.suit) ? 'red' : ''}>
            {suitChar(state.trumpCard.suit)}
          </b>
        </div>
      )}
    </div>
  );
}
