// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CalloutBlock, setCallout } from './callout';

// Headless: the markdown a page saves, without the editor component's menus around it
let editor: Editor | null = null;
const open = (content: string) => {
  editor = new Editor({ extensions: [StarterKit, CalloutBlock, Markdown.configure({ html: false, tightLists: true })], content });
  return editor;
};
const markdownOf = (e: Editor) => (e.storage.markdown as { getMarkdown: () => string }).getMarkdown();
afterEach(() => editor?.destroy());

describe('callouts in markdown', () => {
  it('reads a > [!kind] quote as a callout and writes it back the same', () => {
    const text = 'Before\n\n> [!warning]\n> Back up first.\n>\n> - the database\n\n> Said once';
    const e = open(text);
    expect(e.getJSON().content?.map((block) => block.type)).toEqual(['paragraph', 'callout', 'blockquote']);
    expect(e.getJSON().content?.[1].attrs).toEqual({ kind: 'warning' });
    expect(markdownOf(e)).toBe(text);
  });

  it('turns the blocks under the cursor into a callout, then changes its kind', () => {
    const e = open('Mind the gap.');
    setCallout(e, 'info');
    expect(markdownOf(e)).toBe('> [!info]\n> Mind the gap.');
    setCallout(e, 'danger');
    expect(markdownOf(e)).toBe('> [!danger]\n> Mind the gap.');
  });
});
