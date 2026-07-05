import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { loadLanguage, saveLanguage } from '../lib/storage';
import { EngineMessage } from '../game/engine';
import { formatEngineMessage, Params, translate } from './format';
import { Language } from './translations';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Params) => string;
  formatMessage: (message: EngineMessage) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => loadLanguage() ?? 'en');

  useEffect(() => {
    saveLanguage(lang);
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      formatMessage: (message) => formatEngineMessage(lang, message),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the current language, the setter, and translation helpers. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}
