/**
 * Locales
 * The languages WisePath speaks, and how one is picked: the learner's choice
 * (kept on their account, mirrored in a cookie so the server renders in it),
 * else the browser's languages, else English.
 */

export const LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** The cookie the chosen language travels in, so the first render on the server is already in it */
export const LOCALE_COOKIE = 'wp-locale';

/** Each language's name, written in itself, for the language menu */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
};

export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/**
 * The best of our languages for a list of preferred ones, most preferred first
 * ("pt-PT", "pt" and "pt-BR" all get Portuguese); English when none matches
 */
export function matchLocale(preferred: ReadonlyArray<string>): Locale {
  for (const tag of preferred) {
    const lower = tag.trim().toLowerCase();
    const exact = LOCALES.find((l) => l.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    const sameLanguage = LOCALES.find((l) => l.toLowerCase().split('-')[0] === base);
    if (sameLanguage) return sameLanguage;
  }
  return DEFAULT_LOCALE;
}

/** The languages in an Accept-Language header, by their weight */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag, q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((t) => t.tag && t.tag !== '*')
    .sort((a, b) => b.q - a.q)
    .map((t) => t.tag);
  return matchLocale(tags);
}
