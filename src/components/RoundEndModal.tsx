import { GameState } from '../game/engine';
import { SEAT_NAMES, TEAM_NAMES } from '../game/types';

interface Props {
  state: GameState;
  onNextRound: () => void;
}

export default function RoundEndModal({ state, onNextRound }: Props) {
  const result = state.roundResult;
  if (!result) return null;
  const bidderTeamWon = result.success;
  const humanSide = result.bidderTeam === 0 ? bidderTeamWon : !bidderTeamWon;

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{humanSide ? '🎉 Your team wins the round!' : '😞 Opponents win the round'}</h2>
        <p className="modal-sub">
          {SEAT_NAMES[result.bidder]} bid {result.bid} for {TEAM_NAMES[result.bidderTeam]} and
          took {result.bidderTeamPoints} points — the bid {result.success ? 'was made' : 'failed'}.
        </p>
        <table className="score-table">
          <tbody>
            <tr>
              <td>{TEAM_NAMES[0]}</td>
              <td>{state.teamPoints[0]} pts</td>
              <td>{state.matchWins[0]} rounds</td>
            </tr>
            <tr>
              <td>{TEAM_NAMES[1]}</td>
              <td>{state.teamPoints[1]} pts</td>
              <td>{state.matchWins[1]} rounds</td>
            </tr>
          </tbody>
        </table>
        <button className="btn primary" onClick={onNextRound}>
          Next round →
        </button>
      </div>
    </div>
  );
}
