import { describe, expect, it } from 'vitest';
import type { InboxItem } from '@wisepath/domain/inbox';
import { hostOf, inboxMatches, shownText } from './InboxItemPrompt.helpers';

const item = (fields: Partial<InboxItem> & { text: string }) => ({ id: fields.text, createdAt: '2026-10-17T10:00:00Z', ...fields }) as InboxItem;

describe('the Inbox prompt', () => {
  it('finds items by their words, their link title or their address, ignoring case', () => {
    const items = [item({ text: 'Read about fibers' }), item({ text: 'https://effect.website', url: 'https://effect.website', title: 'Effect docs' })];
    expect(inboxMatches(items, 'FIBERS').map((i) => i.text)).toEqual(['Read about fibers']);
    expect(inboxMatches(items, 'docs').map((i) => i.text)).toEqual(['https://effect.website']);
    expect(inboxMatches(items, '  ')).toHaveLength(2);
  });

  it('shows a bare address by its title, and its site without www', () => {
    expect(shownText(item({ text: 'https://www.x.dev/a', url: 'https://www.x.dev/a', title: 'A page' }))).toBe('A page');
    expect(shownText(item({ text: 'my note on it', url: 'https://www.x.dev/a', title: 'A page' }))).toBe('my note on it');
    expect(hostOf('https://www.x.dev/a')).toBe('x.dev');
    expect(hostOf('not an address')).toBe('not an address');
  });
});
