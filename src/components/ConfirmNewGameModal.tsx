import { useI18n } from '../i18n/LanguageContext';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmNewGameModal({ onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  return (
    <div className="overlay">
      <div className="modal">
        <h2>{t('confirm.title')}</h2>
        <p className="modal-sub">{t('confirm.body')}</p>
        <div className="home-actions">
          <button className="btn danger" onClick={onConfirm}>
            {t('confirm.discard')}
          </button>
          <button className="btn" onClick={onCancel}>
            {t('confirm.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
