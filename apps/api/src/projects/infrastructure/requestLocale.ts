import type { Request } from 'express';
import type { Locale } from '@wisepath/domain/auth';

/**
 * The language the web app is showing to someone whose account has none
 * chosen: the language cookie the web app sets when one is picked, else the
 * browser's (Accept-Language), as the web app itself decides (apps/web/i18n/locales.ts).
 * Undefined when neither names a language WisePath speaks.
 */
export function requestLocale(req: Request): Locale | undefined {
  const cookie: unknown = req.cookies?.['wp-locale'];
  if (cookie === 'en' || cookie === 'pt-BR') return cookie;

  const tags = (req.headers['accept-language'] ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((t) => t.tag && t.tag !== '*')
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (tag.split('-')[0] === 'pt') return 'pt-BR';
    if (tag.split('-')[0] === 'en') return 'en';
  }
  return undefined;
}
