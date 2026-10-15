import { cookies, headers } from 'next/headers';
import { translate } from '@/i18n/format';
import type { Translate } from '@/i18n/I18nProvider';
import { LOCALE_COOKIE, fromAcceptLanguage, isLocale } from '@/i18n/locales';
import { en } from '@/i18n/messages/en';
import { ptBR } from '@/i18n/messages/pt-BR';

/**
 * serverT
 * Messages for what the server writes itself, such as a route's metadata (the
 * tab's title): in the language picked the same way as the root layout does,
 * the chosen one (its cookie) or the browser's.
 */
export async function serverT(): Promise<Translate> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(chosen) ? chosen : fromAcceptLanguage((await headers()).get('accept-language'));
  const messages = locale === 'pt-BR' ? ptBR : en;
  return (key, values) => translate(messages, en, locale, key, values);
}
