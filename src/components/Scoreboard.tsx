import { GameState } from '../game/engine';
import { TEAM_NAMES } from '../game/types';
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
  // Card points are tallied all along internally, but only shown once the
  // round is over — a running total mid-round would spoil the suspense and
  // let a player back-calculate exactly what's left to make (or break) the
  // bid.
  const scoresRevealed = state.phase === 'roundEnd';
  return (
    <aside className="scoreboard">
      <h3>
        <Label long={`Round ${state.round}`} short={`R${state.round}`} />
      </h3>
      <div className="score-row">
        <Label long={`${TEAM_NAMES[0]} (you)`} short="Us" />
        <b>{scoresRevealed ? state.teamPoints[0] : '—'}</b>
      </div>
      <div className="score-row">
        <Label long={TEAM_NAMES[1]} short="Them" />
        <b>{scoresRevealed ? state.teamPoints[1] : '—'}</b>
      </div>
      <hr />
      <div className="score-row">
        <Label long="Bid to beat" short="Bid" />
        <b>
          {state.bid ?? state.highBid ?? '—'}
          {state.bidder !== null && (
            <span className="bidder-tag"> · {state.playerNames[state.bidder]}</span>
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
