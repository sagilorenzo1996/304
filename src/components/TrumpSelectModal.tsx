import { GameState } from '../game/engine';
import { HUMAN } from '../hooks/useGame';
import { useI18n } from '../i18n/LanguageContext';
import CardView from './CardView';

interface Props {
  state: GameState;
  onSelect: (cardId: string) => void;
}

/** The human won the auction: pick a card to place face down as the trump. */
export default function TrumpSelectModal({ state, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <div className="overlay">
      <div className="modal">
        <h2>{t('trumpSelect.title', { bid: state.bid! })}</h2>
        <p className="modal-sub">{t('trumpSelect.body')}</p>
        <div className="trump-choices">
          {state.hands[HUMAN].map((c) => (
            <CardView key={c.id} card={c} onClick={() => onSelect(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
