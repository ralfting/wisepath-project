import type { InboxItem } from '@wisepath/domain/inbox';

/** What an item shows: its own words, or its link's title when only the address was written */
export const shownText = (item: InboxItem) => (item.url !== undefined && item.text.trim() === item.url.trim() ? (item.title ?? item.url) : item.text);

/** The site of an address, without www; the address itself when it is not one */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** The items whose words, title or address have what is typed in them, ignoring case */
export function inboxMatches(items: ReadonlyArray<InboxItem>, query: string): ReadonlyArray<InboxItem> {
  const q = query.trim().toLowerCase();
  return items.filter((item) => `${item.text} ${item.title ?? ''} ${item.url ?? ''}`.toLowerCase().includes(q));
}
