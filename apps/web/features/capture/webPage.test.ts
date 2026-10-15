import { describe, expect, it } from 'vitest';
import { isEmpty, readWebPage, webCaptureInput } from './webPage';

const read = (query: string) => readWebPage(new URLSearchParams(query));

describe('the capture page reads', () => {
  it('the address, the title, the selection and the moment', () => {
    expect(read('url=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3Da&title=A+talk&text=Guards+decide&t=754')).toEqual({
      url: 'https://youtube.com/watch?v=a',
      title: 'A talk',
      quote: 'Guards decide',
      videoTime: 754,
    });
  });

  it('only what came', () => {
    expect(read('title=Docs')).toEqual({ title: 'Docs' });
    expect(isEmpty(read(''))).toBe(true);
    expect(isEmpty(read('title=Docs'))).toBe(false);
  });

  it('leaves out an address that is not a web address, and a moment that is not one', () => {
    expect(read('url=javascript%3Aalert(1)&t=12x')).toEqual({});
    expect(read('url=https%3A%2F%2Fa.org&t=0')).toEqual({ url: 'https://a.org' });
  });

  it("keeps the title on one line, and cuts what is longer than the bookmarklet sends", () => {
    expect(read('title=A%0A%20%20talk').title).toBe('A talk');
    expect(read(`text=${'a'.repeat(5000)}`).quote).toHaveLength(3000);
  });
});

describe('the Inbox item from a web page', () => {
  const page = { url: 'https://a.org/guards', title: 'Guards', quote: 'They decide\n\nwho gets in' };

  it('is the note, then the selection quoted', () => {
    expect(webCaptureInput(page, ' Read again ')).toEqual({
      text: 'Read again\n\n> They decide\n>\n> who gets in',
      url: 'https://a.org/guards',
      title: 'Guards',
    });
  });

  it('is the quote alone without a note', () => {
    expect(webCaptureInput(page, '  ')?.text).toBe('> They decide\n>\n> who gets in');
  });

  it('is the address alone with neither', () => {
    expect(webCaptureInput({ url: 'https://a.org', title: 'A' }, '')).toEqual({ text: 'https://a.org', url: 'https://a.org', title: 'A' });
  });

  it("keeps the video's moment with its address", () => {
    expect(webCaptureInput({ url: 'https://youtube.com/watch?v=a', videoTime: 90 }, 'Here')).toMatchObject({ videoTime: 90 });
    expect(webCaptureInput({ title: 'A', videoTime: 90 }, 'Here')).toEqual({ text: 'Here', title: 'A' });
  });

  it('is nothing when there is nothing to keep', () => {
    expect(webCaptureInput({}, ' ')).toBeNull();
  });
});
