import { describe, expect, it } from 'vitest';
import { LIMITS, bookmarkletHref, bookmarkletScript } from './bookmarklet';

const ORIGIN = 'https://wisepath.example';

interface FakePage {
  readonly href: string;
  readonly title?: string;
  readonly selection?: string;
  readonly videoTime?: number;
  /** A browser that blocks the popup */
  readonly blocked?: boolean;
}

/** Runs the bookmarklet's own code on a fake page; where it went, and the query it carried */
function click(page: FakePage) {
  const opened: Array<{ url: string; name: string; features: string }> = [];
  const location = { href: page.href, hostname: new URL(page.href).hostname };
  const window = {
    getSelection: () => ({ toString: () => page.selection ?? '' }),
    open: (url: string, name: string, features: string) => {
      opened.push({ url, name, features });
      return page.blocked ? null : {};
    },
  };
  const document = {
    title: page.title ?? '',
    querySelector: (selector: string) => (selector === 'video' && page.videoTime !== undefined ? { currentTime: page.videoTime } : null),
  };
  new Function('window', 'document', 'location', bookmarkletScript(ORIGIN))(window, document, location);
  const url = new URL(opened[0]?.url ?? location.href);
  return { opened, location, url, query: Object.fromEntries(url.searchParams) };
}

describe('the bookmarklet', () => {
  it("opens the capture page with the page's title and address", () => {
    const { opened, url, query } = click({ href: 'https://docs.nestjs.com/guards', title: 'Guards | NestJS' });
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ name: 'wisepath-capture', features: 'width=420,height=360' });
    expect(`${url.origin}${url.pathname}`).toBe(`${ORIGIN}/capture`);
    expect(query).toEqual({ url: 'https://docs.nestjs.com/guards', title: 'Guards | NestJS' });
  });

  it('sends the selected text as it is, without the spaces around it', () => {
    const { query } = click({ href: 'https://a.org/x', title: 'A', selection: '  Guards decide & route?  ' });
    expect(query.text).toBe('Guards decide & route?');
  });

  it('cuts a long selection, and says it was cut', () => {
    const { query } = click({ href: 'https://a.org/x', selection: 'a'.repeat(LIMITS.text + 500) });
    expect(query.text).toHaveLength(LIMITS.text);
    expect(query.text?.endsWith('…')).toBe(true);
  });

  it('leaves out an address too long to keep whole, and cuts a long title', () => {
    const { query } = click({ href: `https://a.org/?q=${'x'.repeat(LIMITS.url)}`, title: 't'.repeat(LIMITS.title + 10) });
    expect(query.url).toBeUndefined();
    expect(query.title).toHaveLength(LIMITS.title);
  });

  it("on YouTube, keeps the video's moment in whole seconds", () => {
    const { query } = click({ href: 'https://www.youtube.com/watch?v=abc', title: 'Talk', videoTime: 754.8 });
    expect(query.t).toBe('754');
  });

  it("leaves the moment out at the video's start, and on other sites' videos", () => {
    expect(click({ href: 'https://www.youtube.com/watch?v=abc', videoTime: 0 }).query.t).toBeUndefined();
    expect(click({ href: 'https://vimeo.com/1', videoTime: 30 }).query.t).toBeUndefined();
  });

  it('opens the capture page in the tab when popups are blocked', () => {
    const { location } = click({ href: 'https://a.org/x', title: 'A', blocked: true });
    expect(location.href.startsWith(`${ORIGIN}/capture?`)).toBe(true);
  });

  it('is a javascript: address', () => {
    expect(bookmarkletHref(ORIGIN).startsWith('javascript:(function(){')).toBe(true);
  });
});
