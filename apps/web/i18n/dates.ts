import type { Locale } from './locales';

/**
 * Dates
 * Times as people say them, in the current language: "3 minutes ago",
 * "há 3 minutos". Kept free of React so it can be tested.
 */

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
];

const formats = new Map<Locale, Intl.RelativeTimeFormat>();

/** How long ago (or how far ahead) an ISO date is from now */
export function relativeTime(iso: string, now: number, locale: Locale): string {
  let format = formats.get(locale);
  if (!format) formats.set(locale, (format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })));
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size || unit === 'year') return format.format(Math.round(value), unit);
    value /= size;
  }
  return '';
}

/** A date and time written out in the current language */
export const dateTime = (iso: string, locale: Locale): string =>
  new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
