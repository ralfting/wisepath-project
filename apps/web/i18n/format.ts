import type { Locale } from './locales';

/**
 * Format
 * Turns a message into text: {name} placeholders filled in, and plurals
 * ({ one, other }, and { zero } when it reads better) picked with the
 * language's own rules. Kept free of React so it can be tested and used
 * anywhere.
 */

export interface Plural {
  readonly zero?: string;
  readonly one: string;
  readonly other: string;
}

export type MessageValue = string | Plural;
export interface MessageTree {
  readonly [key: string]: MessageValue | MessageTree;
}

/** The values a message is filled with */
export type Values = Readonly<Record<string, string | number>>;

/** A message tree's shape with any text: what a translation must match, key for key */
export type Shape<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Shape<T[K]>;
};

/** Every key of a message tree, dotted: "map.search.placeholder" */
export type MessageKey<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | Plural ? `${P}${K}` : MessageKey<T[K], `${P}${K}.`>;
}[keyof T & string];

const isPlural = (value: unknown): value is Plural =>
  typeof value === 'object' && value !== null && 'other' in value && typeof (value as Plural).other === 'string';

export function lookup(tree: MessageTree, key: string): MessageValue | undefined {
  let node: MessageValue | MessageTree | undefined = tree;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string' || isPlural(node)) return undefined;
    node = (node as MessageTree)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

const plurals = new Map<Locale, Intl.PluralRules>();
const pluralRules = (locale: Locale) => {
  let rules = plurals.get(locale);
  if (!rules) plurals.set(locale, (rules = new Intl.PluralRules(locale)));
  return rules;
};

/** Fills a message in; a plural takes its form from `count` */
export function render(message: MessageValue, locale: Locale, values: Values = {}): string {
  let text: string;
  if (isPlural(message)) {
    const count = Number(values.count ?? 0);
    const form = pluralRules(locale).select(count);
    text = (count === 0 && message.zero) || (form === 'one' ? message.one : message.other);
  } else {
    text = message;
  }
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/**
 * A key in the language's messages, falling back to the fallback's (English) when it is missing there; the
 * key itself when it is missing everywhere, so a gap shows instead of breaking the page
 */
export function translate(messages: MessageTree, fallback: MessageTree, locale: Locale, key: string, values?: Values): string {
  const message = lookup(messages, key) ?? lookup(fallback, key);
  if (message === undefined) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing message: ${key}`);
    return key;
  }
  return render(message, locale, values);
}
