import { useI18n } from '../i18n/LanguageContext';

interface Props {
  onClose: () => void;
}

export default function HowToPlayModal({ onClose }: Props) {
  const { t } = useI18n();
  return (
    <div className="overlay">
      <div className="modal how-to-play">
        <h2>{t('htp.title')}</h2>
        <ol>
          <li>{t('htp.step1')}</li>
          <li>{t('htp.step2')}</li>
          <li>{t('htp.step3')}</li>
          <li>{t('htp.step4')}</li>
          <li>{t('htp.step5')}</li>
          <li>{t('htp.step6')}</li>
        </ol>
        <p className="modal-sub">{t('htp.cardRanking')}</p>
        <p className="modal-sub">{t('htp.houseRulesTitle')}</p>
        <ul>
          <li>{t('htp.rule1')}</li>
          <li>{t('htp.rule2')}</li>
          <li>{t('htp.rule3')}</li>
          <li>{t('htp.rule4')}</li>
          <li>{t('htp.rule5')}</li>
        </ul>
        <button className="btn primary" onClick={onClose}>
          {t('htp.gotIt')}
        </button>
      </div>
    </div>
  );
}
