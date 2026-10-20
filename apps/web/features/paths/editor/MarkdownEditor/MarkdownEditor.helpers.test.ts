import { describe, expect, it } from 'vitest';
import { pageLinkItems, savedMarkdown } from './MarkdownEditor.helpers';

const page = (id: string, title: string) => ({ id, title, content: '' });
const pages = [page('here', 'Fibers'), page('a', 'Fiber pools'), page('b', 'Scheduler'), page('c', '   ')];

describe('the [[ picker', () => {
  it('offers matching pages but not this one nor untitled ones, and a page to make when none has the name', () => {
    expect(pageLinkItems(pages, 'here', 'fib')).toEqual([{ id: 'a', title: 'Fiber pools' }, { id: null, title: 'fib' }]);
  });

  it('offers a page to make without the [ or ] that would break its links', () => {
    expect(pageLinkItems(pages, 'here', 'Ownership [draft')).toEqual([{ id: null, title: 'Ownership draft' }]);
  });

  it('offers no page to make when one has the name, ignoring case', () => {
    expect(pageLinkItems(pages, 'here', 'scheduler')).toEqual([{ id: 'b', title: 'Scheduler' }]);
  });
});

describe('savedMarkdown', () => {
  it("drops the space a link was put in with, only at a line's end", () => {
    expect(savedMarkdown('See [[Fibers]] \nand [[Scheduler]] then')).toBe('See [[Fibers]]\nand [[Scheduler]] then');
  });
});
