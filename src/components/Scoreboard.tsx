import { GameState } from '../game/engine';
import { SEAT_NAMES, TEAM_NAMES } from '../game/types';
import { suitChar } from './CardView';

/** A label with a compact variant for the mobile top strip. */
function Label({ long, short }: { long: string; short: string }) {
  return (
    <span>
      <span className="long">{long}</span>
      <span className="short">{short}</span>
    </span>
  );
}

/** Persistent panel: team points, the bid to beat, and trump status. */
export default function Scoreboard({ state }: { state: GameState }) {
  return (
    <aside className="scoreboard">
      <h3>
        <Label long={`Round ${state.round}`} short={`R${state.round}`} />
      </h3>
      <div className="score-row">
        <Label long={`${TEAM_NAMES[0]} (you)`} short="Us" />
        <b>{state.teamPoints[0]}</b>
      </div>
      <div className="score-row">
        <Label long={TEAM_NAMES[1]} short="Them" />
        <b>{state.teamPoints[1]}</b>
      </div>
      <hr />
      <div className="score-row">
        <Label long="Bid to beat" short="Bid" />
        <b>
          {state.bid ?? state.highBid ?? '—'}
          {state.bidder !== null && (
            <span className="bidder-tag"> · {SEAT_NAMES[state.bidder]}</span>
          )}
        </b>
      </div>
      <div className="score-row">
        <span>Trump</span>
        <b>
          {state.trumpCard === null
            ? '—'
            : state.trumpRevealed
              ? suitChar(state.trumpCard.suit)
              : '🂠'}
        </b>
      </div>
      <hr />
      <div className="score-row">
        <Label long="Rounds won" short="Won" />
        <b>
          {state.matchWins[0]} : {state.matchWins[1]}
        </b>
      </div>
    </aside>
  );
}
