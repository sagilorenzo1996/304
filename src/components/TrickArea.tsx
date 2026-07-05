import { GameState } from '../game/engine';
import { trickPoints } from '../game/rules';
import { HUMAN } from '../hooks/useGame';
import CardView from './CardView';

/**
 * The center of the table: cards slide in from the seat that played them
 * and, once the trick is complete, sweep away toward the winner while the
 * captured points float up.
 */
export default function TrickArea({ state }: { state: GameState }) {
  const sweepClass =
    state.trickComplete && state.trickWinnerSeat !== null
      ? `sweep-${state.trickWinnerSeat}`
      : '';
  const points = state.trickComplete ? trickPoints(state.currentTrick) : 0;
  return (
    <div className={`trick-area ${sweepClass}`}>
      {state.currentTrick.map((p) => (
        <CardView
          key={p.card.id}
          card={p.card}
          faceDown={p.concealed && p.seat !== HUMAN && state.bidder !== HUMAN}
          className={`played pos-${p.seat} from-${p.seat}`}
        />
      ))}
      {state.trickComplete && points > 0 && (
        <div className="trick-points">+{points}</div>
      )}
    </div>
  );
}
