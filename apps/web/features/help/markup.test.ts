import { describe, expect, it } from 'vitest';
import { parseRich } from './markup';

describe('help markup', () => {
  it('reads bold, code and keys between plain text', () => {
    expect(parseRich('Choose **Page**, type `/` and press <kbd>Enter</kbd>.')).toEqual([
      { kind: 'text', text: 'Choose ' },
      { kind: 'bold', text: 'Page' },
      { kind: 'text', text: ', type ' },
      { kind: 'code', text: '/' },
      { kind: 'text', text: ' and press ' },
      { kind: 'kbd', text: 'Enter' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('leaves text without markup, and [[links]] and [01:25] times, as they are', () => {
    expect(parseRich('Write `[[Name]]`, like [01:25]')).toEqual([
      { kind: 'text', text: 'Write ' },
      { kind: 'code', text: '[[Name]]' },
      { kind: 'text', text: ', like [01:25]' },
    ]);
  });
});
