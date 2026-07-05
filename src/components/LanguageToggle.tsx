import { useI18n } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

/** Lets the player switch the app's language at any time; choice persists. */
export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="language-toggle">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`lang-option${lang === l.id ? ' active' : ''}`}
          onClick={() => setLang(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
