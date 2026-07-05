import { BID_STEP, GameState, isValidBid, MAX_BID, MIN_BID } from '../game/engine';
import { HUMAN } from '../hooks/useGame';
import { useI18n } from '../i18n/LanguageContext';
import CardView from './CardView';

interface Props {
  state: GameState;
  onBid: (bid: number | null) => void;
}

/** Overlay shown while it is the human's turn to bid. */
export default function BiddingModal({ state, onBid }: Props) {
  const { t } = useI18n();
  const need = state.highBid === null ? MIN_BID : state.highBid + BID_STEP;
  const options: number[] = [];
  for (let bid = need; bid <= 300 && options.length < 4; bid += BID_STEP) {
    if (isValidBid(state, bid)) options.push(bid);
  }
  if (isValidBid(state, MAX_BID)) options.push(MAX_BID);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{t('bid.title')}</h2>
        <p className="modal-sub">
          {state.highBid === null
            ? t('bid.opensAt', { min: MIN_BID })
            : t('bid.holdsAt', { name: state.playerNames[state.highBidder!], bid: state.highBid })}
        </p>
        <div className="hand-preview">
          {state.hands[HUMAN].map((c) => (
            <CardView key={c.id} card={c} />
          ))}
        </div>
        <div className="bid-history">
          {state.bidHistory.map((entry, i) => (
            <span key={i} className={`chip ${entry.bid === null ? 'muted' : ''}`}>
              {state.playerNames[entry.seat]}: {entry.bid ?? t('bid.pass')}
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
            {t('bid.pass')}
          </button>
        </div>
      </div>
    </div>
  );
}
