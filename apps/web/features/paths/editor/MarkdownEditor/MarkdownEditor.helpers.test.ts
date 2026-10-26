import { describe, expect, it } from 'vitest';
import { notesInMargin, pageLinkItems, savedMarkdown, webAddress } from './MarkdownEditor.helpers';

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

describe('a web link\'s address', () => {
  it('keeps an address with http or https as written', () => {
    expect(webAddress('https://docs.nestjs.com/guards')).toBe('https://docs.nestjs.com/guards');
    expect(webAddress('http://localhost:4002')).toBe('http://localhost:4002');
  });

  it('adds https to a bare host, so it opens the site and not a path inside the app', () => {
    expect(webAddress('www.google.com')).toBe('https://www.google.com');
    expect(webAddress(' docs.nestjs.com/guards?x=1 ')).toBe('https://docs.nestjs.com/guards?x=1');
  });

  it('gives nothing for what is not a web address', () => {
    expect(webAddress('/paths/1')).toBeNull();
    expect(webAddress('mailto:ada@example.com')).toBeNull();
    expect(webAddress('javascript:alert(1)')).toBeNull();
    expect(webAddress('notes')).toBeNull();
  });
});

describe('notesInMargin', () => {
  it('puts the note bubbles in the margin when the full page has room on its left', () => {
    expect(notesInMargin({ left: 4, right: 0 })).toBe(true);
  });

  it('keeps them at the end of their words in a narrow window or outside a full page', () => {
    expect(notesInMargin({ left: 3.9, right: 40 })).toBe(false);
    expect(notesInMargin(null)).toBe(false);
  });
});
