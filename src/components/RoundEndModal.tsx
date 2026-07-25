import { GameState } from '../game/engine';
import { useI18n } from '../i18n/LanguageContext';

interface Props {
  state: GameState;
  onNextRound: () => void;
}

export default function RoundEndModal({ state, onNextRound }: Props) {
  const { t } = useI18n();
  const result = state.roundResult;
  if (!result) return null;
  const bidderTeamWon = result.success;
  const humanSide = result.bidderTeam === 0 ? bidderTeamWon : !bidderTeamWon;

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{humanSide ? t('round.teamWins') : t('round.oppWins')}</h2>
        <p className="modal-sub">
          {t('round.summary', {
            name: state.playerNames[result.bidder],
            bid: result.bid,
            team: t(`team.${result.bidderTeam}`),
            points: result.bidderTeamPoints,
            result: t(result.success ? 'round.made' : 'round.failed'),
          })}
        </p>
        <table className="score-table">
          <tbody>
            <tr>
              <td>{t('team.0')}</td>
              <td>
                {state.teamPoints[0]} {t('round.pts')}
              </td>
              <td>
                {state.matchWins[0]} {t('round.rounds')}
              </td>
            </tr>
            <tr>
              <td>{t('team.1')}</td>
              <td>
                {state.teamPoints[1]} {t('round.pts')}
              </td>
              <td>
                {state.matchWins[1]} {t('round.rounds')}
              </td>
            </tr>
          </tbody>
        </table>
        <button className="btn primary" onClick={onNextRound}>
          {t('round.next')}
        </button>
      </div>
    </div>
  );
}
