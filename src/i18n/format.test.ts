import { describe, expect, it } from 'vitest';
import { formatEngineMessage, interpolate, translate } from './format';
import { LANGUAGES, TRANSLATIONS } from './translations';

describe('interpolate', () => {
  it('replaces {param} placeholders', () => {
    expect(interpolate('{name} bids {bid}.', { name: 'Kasun', bid: 210 })).toBe('Kasun bids 210.');
  });

  it('leaves unmatched placeholders untouched', () => {
    expect(interpolate('{name} bids {bid}.', { name: 'Kasun' })).toBe('Kasun bids {bid}.');
  });

  it('passes templates through unchanged with no params', () => {
    expect(interpolate('Hello there.')).toBe('Hello there.');
  });
});

describe('translate', () => {
  it('looks up the requested language', () => {
    expect(translate('si', 'bid.pass')).toBe('පාස්');
    expect(translate('en', 'bid.pass')).toBe('Pass');
  });

  it('falls back to English, then the raw key, for an unknown key', () => {
    expect(translate('si', 'bid.title')).toBe(TRANSLATIONS.si['bid.title']);
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key');
  });
});

describe('formatEngineMessage', () => {
  it('interpolates a single-part message', () => {
    const text = formatEngineMessage('en', [{ key: 'msg.bids', params: { name: 'Kasun', bid: 210 } }]);
    expect(text).toBe('Kasun bids 210.');
  });

  it('resolves a suit param through the suit dictionary', () => {
    const text = formatEngineMessage('en', [
      { key: 'msg.trumpAutoRevealed', params: { suit: 'S' } },
    ]);
    expect(text).toContain('♠ Spades');

    const siText = formatEngineMessage('si', [
      { key: 'msg.trumpAutoRevealed', params: { suit: 'S' } },
    ]);
    expect(siText).toContain('ස්පේඩ්');
  });

  it('joins multiple parts with a space', () => {
    const text = formatEngineMessage('en', [
      { key: 'msg.hiddenCardExposesTrump', params: { name: 'Kasun', suit: 'H' } },
      { key: 'msg.takesTrick', params: { name: 'Priya', points: 20 } },
    ]);
    expect(text).toBe(
      'Kasun’s hidden card exposes the trump — it is ♥ Hearts! Priya takes the trick (+20 points).',
    );
  });

  it('renders an empty message as an empty string', () => {
    expect(formatEngineMessage('en', [])).toBe('');
  });
});

describe('translation completeness', () => {
  it('has the exact same set of keys in every language', () => {
    const [first, ...rest] = LANGUAGES.map((l) => l.id);
    const baseline = new Set(Object.keys(TRANSLATIONS[first]));
    for (const lang of rest) {
      const keys = new Set(Object.keys(TRANSLATIONS[lang]));
      const missing = [...baseline].filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !baseline.has(k));
      expect(missing, `${lang} is missing keys: ${missing.join(', ')}`).toHaveLength(0);
      expect(extra, `${lang} has extra keys: ${extra.join(', ')}`).toHaveLength(0);
    }
  });

  it('has no empty translation strings', () => {
    for (const lang of LANGUAGES.map((l) => l.id)) {
      for (const [key, value] of Object.entries(TRANSLATIONS[lang])) {
        expect(value.length, `${lang}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
