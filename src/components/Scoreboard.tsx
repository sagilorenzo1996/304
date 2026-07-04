import { GameState } from '../game/engine';
import { SEAT_NAMES, TEAM_NAMES } from '../game/types';
import { suitChar } from './CardView';

/** Persistent panel: team points, the bid to beat, and trump status. */
export default function Scoreboard({ state }: { state: GameState }) {
  return (
    <aside className="scoreboard">
      <h3>Round {state.round}</h3>
      <div className="score-row">
        <span>{TEAM_NAMES[0]} (you)</span>
        <b>{state.teamPoints[0]}</b>
      </div>
      <div className="score-row">
        <span>{TEAM_NAMES[1]}</span>
        <b>{state.teamPoints[1]}</b>
      </div>
      <hr />
      <div className="score-row">
        <span>Bid to beat</span>
        <b>{state.bid ?? state.highBid ?? '—'}</b>
      </div>
      {state.bidder !== null && (
        <div className="score-row">
          <span>Bidder</span>
          <b>{SEAT_NAMES[state.bidder]}</b>
        </div>
      )}
      <div className="score-row">
        <span>Trump</span>
        <b>
          {state.trumpCard === null
            ? '—'
            : state.trumpRevealed
              ? suitChar(state.trumpCard.suit)
              : 'Hidden 🂠'}
        </b>
      </div>
      <hr />
      <div className="score-row">
        <span>Rounds won</span>
        <b>
          {state.matchWins[0]} : {state.matchWins[1]}
        </b>
      </div>
    </aside>
  );
}
