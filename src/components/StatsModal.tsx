import { useI18n } from '../i18n/LanguageContext';
import { loadStats } from '../lib/stats';

interface Props {
  onClose: () => void;
}

export default function StatsModal({ onClose }: Props) {
  const { t } = useI18n();
  const stats = loadStats();
  const winRate =
    stats.roundsPlayed === 0 ? '—' : `${Math.round((stats.roundsWon / stats.roundsPlayed) * 100)}%`;

  const rows: [string, string | number][] = [
    [t('stats.roundsPlayed'), stats.roundsPlayed],
    [t('stats.roundsWon'), stats.roundsWon],
    [t('stats.roundsLost'), stats.roundsLost],
    [t('stats.winRate'), winRate],
    [t('stats.currentStreak'), stats.currentStreak],
    [t('stats.bestStreak'), stats.bestStreak],
    [t('stats.bidsAttempted'), stats.bidsAttempted],
    [t('stats.bidsMade'), stats.bidsMade],
    [t('stats.highestBidMade'), stats.highestBidMade || '—'],
    [t('stats.totalPointsWon'), stats.totalPointsWon],
  ];

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{t('stats.title')}</h2>
        <table className="score-table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn primary" onClick={onClose}>
          {t('stats.close')}
        </button>
      </div>
    </div>
  );
}
