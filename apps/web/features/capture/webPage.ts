/**
 * Web page
 * What the bookmarklet brought to /capture (?url=&title=&text=&t=), and the
 * Inbox item made from it with the learner's own note. Kept free of React so
 * it can be tested.
 */

import type { CaptureInput } from '@/useCases/inbox';
import { LIMITS } from './bookmarklet';

/** A page met on the web: each part only when it came, and made safe to keep */
export interface WebPage {
  readonly url?: string;
  readonly title?: string;
  /** The text selected on the page */
  readonly quote?: string;
  /** The video's moment, in seconds */
  readonly videoTime?: number;
}

type Query = { get(name: string): string | null };

const clean = (value: string | null, max: number) => {
  const text = value?.trim();
  return text ? text.slice(0, max) : undefined;
};

/** Reads the capture page's query; anything that isn't what the bookmarklet sends is left out */
export function readWebPage(query: Query): WebPage {
  const url = clean(query.get('url'), LIMITS.url);
  const title = clean(query.get('title'), LIMITS.title)?.replace(/\s+/g, ' ');
  // The quote is shown and kept as the reader selected it, but a typed address can carry much more
  const quote = clean(query.get('text'), LIMITS.text);
  const t = query.get('t');
  const videoTime = t && /^\d{1,6}$/.test(t) ? Number(t) : undefined;
  return {
    ...(url && /^https?:\/\/\S+$/i.test(url) ? { url } : {}),
    ...(title ? { title } : {}),
    ...(quote ? { quote } : {}),
    ...(videoTime !== undefined && videoTime > 0 ? { videoTime } : {}),
  };
}

/** A page with nothing to keep: no address, no title and no selection */
export const isEmpty = (page: WebPage) => !page.url && !page.title && !page.quote;

/** The quote as a markdown block quote, each line marked */
const asQuote = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');

/**
 * The Inbox item: the note, then the selection quoted below it. With neither,
 * the item is the address alone (or the title, when there is no address).
 */
export function webCaptureInput(page: WebPage, note: string): CaptureInput | null {
  const text = [note.trim(), page.quote ? asQuote(page.quote) : ''].filter(Boolean).join('\n\n') || page.url || page.title;
  if (!text) return null;
  return {
    text,
    ...(page.url ? { url: page.url } : {}),
    ...(page.title ? { title: page.title } : {}),
    ...(page.url && page.videoTime !== undefined ? { videoTime: page.videoTime } : {}),
  };
}
