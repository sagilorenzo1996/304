import { EngineMessage } from '../game/engine';
import { Language, TRANSLATIONS } from './translations';

export type Params = Record<string, string | number>;

/** Replace every `{key}` in `template` with `params[key]`, left as-is if missing. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Look up `key` for `lang`, falling back to English, then the raw key. */
export function translate(lang: Language, key: string, params?: Params): string {
  const template = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
  return interpolate(template, params);
}

/**
 * Render a structured game-engine message (see game/engine.ts) in `lang`.
 * A `suit` param is special-cased: it's resolved through the `suit.*`
 * dictionary entries and exposed to the template as `{suitWord}`, since
 * the engine only knows the raw suit code ('S' | 'H' | 'D' | 'C').
 */
export function formatEngineMessage(lang: Language, message: EngineMessage): string {
  return message
    .map((part) => {
      if (!part.params || !('suit' in part.params)) return translate(lang, part.key, part.params);
      const { suit, ...rest } = part.params;
      const suitWord = translate(lang, `suit.${suit}`);
      return translate(lang, part.key, { ...rest, suitWord });
    })
    .join(' ');
}
