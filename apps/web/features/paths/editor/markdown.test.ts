import { describe, expect, it } from 'vitest';
import { withQuoteBlocksBack } from './markdown';

describe('putting back a quote block saved fallen out of it', () => {
  it.each([
    '> [!question]\n> ### Title\n>\n> *Description.*\n>\n> Third block.',
    '> [!question]\n> ### Title\n>\n> **Bold desc.**\n>\n> ***Both.***',
    '> [!question]\n> ### Title\n\n> Said apart, after the question.',
    '> Quote\n\n\\*&gt; a paragraph written with the stars, not italics',
    '*> *Not after a quote.*',
    'Text with \\*\\***bold** out of any quote',
    '> [!info]\n> Rule below\n>\n> ****',
    '',
  ])('leaves %j as it is', (markdown) => {
    expect(withQuoteBlocksBack(markdown)).toBe(markdown);
  });

  it.each([
    '> [!question]\n> ### Title\n\n*> *Description.*\n>\n> Third block.',
    '> [!question]\n> ### Title\n\n\\*&gt; *Desc.*\n\n\\*&gt; *Third.*\n\n> Fourth.',
    '> [!info]\n> First. \\*\\***Then** the guard. \\*\\***Again.**\n>\n> Last.',
    '> [!info]\n> First.\n> ****Then** the guard.',
  ])('puts back %j once, and a second pass changes nothing', (saved) => {
    const repaired = withQuoteBlocksBack(saved);
    expect(repaired).not.toBe(saved);
    expect(withQuoteBlocksBack(repaired)).toBe(repaired);
  });
});
