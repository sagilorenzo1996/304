import { useI18n } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface Props {
  className?: string;
}

/**
 * A single compact button showing the current language; tapping it
 * switches to the other one. Deliberately sized and shaped like
 * MuteButton so the two sit together as one control cluster instead of
 * competing for space (there's only ever two languages, so a toggle needs
 * no menu).
 */
export default function LanguageToggle({ className }: Props) {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.id === lang)!;
  const next = LANGUAGES.find((l) => l.id !== lang)!;
  return (
    <button
      className={`language-toggle${className ? ` ${className}` : ''}`}
      onClick={() => setLang(next.id)}
      aria-label={`Switch language to ${next.label}`}
      title={`Switch language to ${next.label}`}
    >
      {current.short}
    </button>
  );
}
