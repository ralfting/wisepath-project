import { describe, expect, it } from 'vitest';
import { render, translate } from '@/i18n/format';
import { fromAcceptLanguage, matchLocale } from '@/i18n/locales';
import { relativeTime } from '@/i18n/dates';

describe('messages', () => {
  const en = { home: { pages: { one: '{count} page', other: '{count} pages' }, hello: 'Hello, {name}' } };
  const pt = { home: { pages: { zero: 'Nenhuma página', one: '{count} página', other: '{count} páginas' }, hello: 'Olá, {name}' } };

  it('fills placeholders and leaves unknown ones as written', () => {
    expect(render('Hello, {name}', 'en', { name: 'Ada' })).toBe('Hello, Ada');
    expect(render('Hello, {who}', 'en', {})).toBe('Hello, {who}');
  });

  it("picks the plural form by the language's rules, and zero when given", () => {
    expect(translate(en, en, 'en', 'home.pages', { count: 1 })).toBe('1 page');
    expect(translate(en, en, 'en', 'home.pages', { count: 3 })).toBe('3 pages');
    expect(translate(pt, en, 'pt-BR', 'home.pages', { count: 0 })).toBe('Nenhuma página');
    expect(translate(pt, en, 'pt-BR', 'home.pages', { count: 2 })).toBe('2 páginas');
  });

  it('falls back to English, then to the key', () => {
    expect(translate({ home: {} }, en, 'pt-BR', 'home.hello', { name: 'Ada' })).toBe('Hello, Ada');
    expect(translate(en, en, 'en', 'home.missing')).toBe('home.missing');
  });
});

describe('languages', () => {
  it("matches the browser's preferences to ours, Portuguese from any Portuguese", () => {
    expect(matchLocale(['pt-PT', 'en'])).toBe('pt-BR');
    expect(matchLocale(['fr', 'de'])).toBe('en');
    expect(matchLocale(['en-GB'])).toBe('en');
  });

  it('reads Accept-Language by weight', () => {
    expect(fromAcceptLanguage('fr;q=0.9, pt-BR;q=0.8, en;q=0.7')).toBe('pt-BR');
    expect(fromAcceptLanguage('en-US,en;q=0.9,pt;q=0.8')).toBe('en');
    expect(fromAcceptLanguage(null)).toBe('en');
  });

  it('says how long ago in each language', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(relativeTime('2026-10-15T11:57:00Z', now, 'en')).toBe('3 minutes ago');
    expect(relativeTime('2026-10-15T11:57:00Z', now, 'pt-BR')).toBe('há 3 minutos');
  });
});
