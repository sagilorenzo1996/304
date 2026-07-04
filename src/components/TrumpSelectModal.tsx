import { GameState } from '../game/engine';
import { HUMAN } from '../hooks/useGame';
import CardView from './CardView';

interface Props {
  state: GameState;
  onSelect: (cardId: string) => void;
}

/** The human won the auction: pick a card to place face down as the trump. */
export default function TrumpSelectModal({ state, onSelect }: Props) {
  return (
    <div className="overlay">
      <div className="modal">
        <h2>You won the bid at {state.bid}!</h2>
        <p className="modal-sub">
          Choose a card to place face down — its suit becomes the secret trump.
        </p>
        <div className="trump-choices">
          {state.hands[HUMAN].map((c) => (
            <CardView key={c.id} card={c} onClick={() => onSelect(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
