import { BID_STEP, GameState, isValidBid, MAX_BID, MIN_BID } from '../game/engine';
import { SEAT_NAMES } from '../game/types';
import { HUMAN } from '../hooks/useGame';
import CardView from './CardView';

interface Props {
  state: GameState;
  onBid: (bid: number | null) => void;
}

/** Overlay shown while it is the human's turn to bid. */
export default function BiddingModal({ state, onBid }: Props) {
  const need = state.highBid === null ? MIN_BID : state.highBid + BID_STEP;
  const options: number[] = [];
  for (let bid = need; bid <= 300 && options.length < 4; bid += BID_STEP) {
    if (isValidBid(state, bid)) options.push(bid);
  }
  if (isValidBid(state, MAX_BID)) options.push(MAX_BID);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Your bid</h2>
        <p className="modal-sub">
          {state.highBid === null
            ? `Bidding opens at ${MIN_BID}.`
            : `${SEAT_NAMES[state.highBidder!]} holds the bid at ${state.highBid}.`}
        </p>
        <div className="hand-preview">
          {state.hands[HUMAN].map((c) => (
            <CardView key={c.id} card={c} />
          ))}
        </div>
        <div className="bid-history">
          {state.bidHistory.map((entry, i) => (
            <span key={i} className={`chip ${entry.bid === null ? 'muted' : ''}`}>
              {SEAT_NAMES[entry.seat]}: {entry.bid ?? 'Pass'}
            </span>
          ))}
        </div>
        <div className="bid-buttons">
          {options.map((bid) => (
            <button key={bid} className="btn primary" onClick={() => onBid(bid)}>
              {bid}
            </button>
          ))}
          <button className="btn danger" onClick={() => onBid(null)}>
            Pass
          </button>
        </div>
      </div>
    </div>
  );
}
