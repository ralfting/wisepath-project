// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CalloutBlock } from '../../callout';
import { YouTubeVideo } from '../../youtube';
import { depthsOf, entriesOf, outlinePlace, sameEntries } from './Outline.helpers';

let editor: Editor | null = null;
const entries = (content: string) => {
  editor = new Editor({ extensions: [StarterKit, CalloutBlock, YouTubeVideo, Markdown.configure({ html: false, tightLists: true })], content });
  return entriesOf(editor.state.doc);
};
afterEach(() => editor?.destroy());

const shape = (list: ReturnType<typeof entriesOf>) => list.map(({ pos: _pos, ...entry }) => entry);

describe('entriesOf', () => {
  it('lists headings, questions and videos in text order', () => {
    const text = [
      '## Routes',
      'Some text.',
      'https://www.youtube.com/watch?v=abc123',
      '### Guards',
      '> [!question]\n> ### Why guard a route?\n>\n> Think of who calls it.',
      '## Tests',
    ].join('\n\n');
    expect(shape(entries(text))).toEqual([
      { kind: 'heading', level: 2, text: 'Routes' },
      { kind: 'video', url: 'https://www.youtube.com/watch?v=abc123' },
      { kind: 'heading', level: 3, text: 'Guards' },
      { kind: 'question', index: 0, text: 'Why guard a route?' },
      { kind: 'heading', level: 2, text: 'Tests' },
    ]);
  });

  it('lists a heading inside a question once, as the question', () => {
    const list = entries('> [!question]\n> ### Why guard a route?');
    expect(shape(list)).toEqual([{ kind: 'question', index: 0, text: 'Why guard a route?' }]);
  });

  it('reads a question written as a paragraph by its first block, on one line', () => {
    const list = entries('> [!question]\n> What   does a guard\n> return?\n>\n> Hint: a boolean.');
    expect(shape(list)).toEqual([{ kind: 'question', index: 0, text: 'What does a guard return?' }]);
  });

  it('counts an empty question, so the questions after it keep their place', () => {
    const list = entries('> [!question]\n> \n\nBetween\n\n> [!question]\n> Second?');
    expect(shape(list)).toEqual([{ kind: 'question', index: 1, text: 'Second?' }]);
  });

  it('does not look into code blocks', () => {
    expect(entries('```md\n## Not a heading\n```')).toEqual([]);
  });
});

describe('depthsOf', () => {
  it('puts a question or a video one step under the heading before it, at the top before any heading', () => {
    const list = entries(
      ['https://youtu.be/intro', '## Routes', '> [!question]\n> Why?', '### Guards', 'https://youtu.be/guards'].join('\n\n'),
    );
    expect(list.map((entry) => entry.kind)).toEqual(['video', 'heading', 'question', 'heading', 'video']);
    expect(depthsOf(list)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe('sameEntries', () => {
  it('keeps the current list while nothing in it changed, and takes the new one when anything did', () => {
    const current = entries('## One\n\n> [!question]\n> Why?');
    expect(sameEntries(current, entries('## One\n\n> [!question]\n> Why?'))).toBe(current);
    const renamed = entries('## One\n\n> [!question]\n> Why not?');
    expect(sameEntries(current, renamed)).toBe(renamed);
  });
});

describe('outlinePlace', () => {
  it('lists the headings beside a full page with room for the list on its right', () => {
    expect(outlinePlace(18, false)).toBe('list');
  });

  it('puts the dashes in the margin when there is room for them but not for the list', () => {
    expect(outlinePlace(17.9, false)).toBe('margin');
    expect(outlinePlace(3.5, false)).toBe('margin');
  });

  it('keeps the dashes inside the page with no room, outside a full page, or while a note card holds the margin', () => {
    expect(outlinePlace(3.4, false)).toBe('inside');
    expect(outlinePlace(null, false)).toBe('inside');
    expect(outlinePlace(40, true)).toBe('inside');
  });
});
