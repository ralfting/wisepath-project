// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CALLOUT_KINDS, PageId, PathId, activitiesIn, questionsIn } from '@wisepath/domain/paths';
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
    setCallout(e, 'activity');
    expect(markdownOf(e)).toBe('> [!activity]\n> Mind the gap.');
    setCallout(e, 'question');
    expect(markdownOf(e)).toBe('> [!question]\n> Mind the gap.');
  });

  it('keeps a question written as a heading a heading, in the editor and back in markdown', () => {
    const text = '> [!question]\n> ### Why guard a route?\n>\n> Think of who calls it.';
    const e = open(text);
    expect(e.getJSON().content?.[0].content?.map((block) => block.type)).toEqual(['heading', 'paragraph']);
    expect(markdownOf(e)).toBe(text);
  });

  it('starts a question made on an empty line as a small heading, and keeps written words as they are', () => {
    const e = open('');
    setCallout(e, 'question');
    e.commands.insertContent('Why guard a route?');
    expect(markdownOf(e)).toBe('> [!question]\n> ### Why guard a route?');

    const written = open('Why guard a route?');
    setCallout(written, 'question');
    expect(markdownOf(written)).toBe('> [!question]\n> Why guard a route?');
  });

  // A mark opening a block that follows another inside a quote used to swallow the quote's > and drop the block out
  // of it on the next load (docs/bugs/BUG-010-callout-block-falls-out.md)
  it.each(
    CALLOUT_KINDS.flatMap((kind) => [
      `> [!${kind}]\n> ### Why guard a route?\n>\n> *Think of who calls it.*`,
      `> [!${kind}]\n> First the setup.\n>\n> **Then** the guard, ***twice***.`,
      `> [!${kind}]\n> ### Steps\n>\n> - *one*\n> - two\n>\n> _Done._`,
    ]),
  )('keeps every block of %j inside its callout, read and written back the same', (text) => {
    const e = open(text);
    const [callout, ...after] = e.getJSON().content ?? [];
    expect([callout.type, after]).toEqual(['callout', []]);
    expect(markdownOf(e)).toBe(text);
  });

  it('keeps a plain quote whole when its second paragraph opens with a mark', () => {
    const text = '> Said once.\n>\n> *Said twice.*';
    expect(markdownOf(open(text))).toBe(text);
  });

  it('writes a question typed as a heading and an italic line under it as one question, read the same by the domain', () => {
    const e = open('');
    setCallout(e, 'question');
    e.commands.insertContent('Why guard a route?');
    e.commands.splitBlock();
    e.chain().toggleItalic().insertContent('Think of who calls it.').run();
    const saved = markdownOf(e);
    expect(saved).toBe('> [!question]\n> ### Why guard a route?\n>\n> *Think of who calls it.*');

    const page = { id: PageId.make('page'), content: saved };
    const reloaded = { ...page, content: markdownOf(open(saved)) };
    expect(questionsIn(PathId.make('p'), reloaded)).toEqual(questionsIn(PathId.make('p'), page));
    expect(questionsIn(PathId.make('p'), page).map((question) => question.text)).toEqual(['### Why guard a route? *Think of who calls it.*']);
  });

  // The editor gives the nth activity block the domain's nth id, so both must find the same blocks
  it.each([
    '> [!activity]\n> One\n\n> [!activity]\n> Two **bold** `code`',
    '```md\n> [!activity]\n> In code\n```\n\n> [!activity]\n> After code',
    '- > [!activity]\n  > In a list\n\n> Quote\n>\n> > [!activity]\n> > Inside',
    '> [!activity]\n> Carried\non\n> [!activity]\n> Not a second one',
    '> [!info]\n> Not one\n\n> [!activity]\n>\n> - a list\n> - inside',
  ])('finds the activities the domain lists in %j', (content) => {
    const e = open(content);
    let blocks = 0;
    e.state.doc.descendants((node) => {
      if (node.type.name === 'callout' && node.attrs.kind === 'activity') blocks++;
    });
    expect(blocks).toBe(activitiesIn(PathId.make('p'), { id: PageId.make('page'), content }).length);
  });
});
