import { GameState } from '../game/engine';
import CardView from './CardView';

/**
 * The center of the table: cards slide in from the seat that played them
 * and, once the trick is complete, sweep away toward the winner.
 */
export default function TrickArea({ state }: { state: GameState }) {
  const sweepClass =
    state.trickComplete && state.trickWinnerSeat !== null
      ? `sweep-${state.trickWinnerSeat}`
      : '';
  return (
    <div className={`trick-area ${sweepClass}`}>
      {state.currentTrick.map((p) => (
        <CardView
          key={p.card.id}
          card={p.card}
          className={`played pos-${p.seat} from-${p.seat}`}
        />
      ))}
    </div>
  );
}
