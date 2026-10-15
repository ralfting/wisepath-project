import type { Locale } from '@/i18n/locales';

/** How long until a card comes back, short and in the current language: "10 min", "3 days", "2 mo" */
export function untilNext(ms: number, locale: Locale): string {
  const minutes = ms / 60_000;
  const [value, unit]: [number, 'minute' | 'hour' | 'day' | 'month' | 'year'] =
    minutes < 60
      ? [minutes, 'minute']
      : minutes < 60 * 24
        ? [minutes / 60, 'hour']
        : minutes < 60 * 24 * 30
          ? [minutes / (60 * 24), 'day']
          : minutes < 60 * 24 * 365
            ? [minutes / (60 * 24 * 30), 'month']
            : [minutes / (60 * 24 * 365), 'year'];
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 0 }).format(Math.max(1, Math.round(value)));
}
