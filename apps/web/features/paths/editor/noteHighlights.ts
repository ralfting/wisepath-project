import { Extension } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import { locateQuote, quoteAt } from '@wisepath/domain/paths';
import type { TextQuote } from '@wisepath/domain/paths';

/**
 * The reader's notes on passages of the text (docs/plans/21-page-notes.md), drawn over the words they were made on
 * wherever those words are now, in a read-only editor too. The editor only draws them and says what was clicked or
 * selected; the notes themselves belong to the page around it.
 */

/** Where something is on screen, in window coordinates */
export type NoteRect = { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };

/** What the editor needs of the reader's notes, read through its context so it is always the latest */
export interface EditorNotes {
  /** Notes without a quote are on the whole page and are not drawn */
  readonly items: ReadonlyArray<{ readonly id: string; readonly quote?: TextQuote }>;
  /** The note whose card is open, drawn stronger */
  readonly openId: string | null;
  readonly onOpen: (noteId: string, at: NoteRect) => void;
  /** Note was asked for on the selected words */
  readonly onSelection: (quote: TextQuote, at: NoteRect) => void;
  /** The notes whose words are in the text, in the order they appear; called when that changes */
  readonly onFound: (noteIds: ReadonlyArray<string>) => void;
}

/** The text as the reader sees it, and the doc position of each of its characters */
interface DocText {
  readonly text: string;
  readonly positions: ReadonlyArray<number>;
}

/** Text nodes in order, blocks apart by a line break; a [[link]] reads as its title, which is what shows */
function docText(doc: ProseMirrorNode): DocText {
  let text = '';
  const positions: number[] = [];
  const add = (chars: string, pos: number, perChar: 0 | 1) => {
    for (let i = 0; i < chars.length; i++) positions.push(pos + i * perChar);
    text += chars;
  };
  doc.descendants((node, pos) => {
    if (node.isText) add(node.text ?? '', pos, 1);
    else if (node.isBlock) {
      if (text !== '' && !text.endsWith('\n')) add('\n', pos, 0);
      return true;
    } else if (node.type.name === 'wikiLink') add(String(node.attrs.title), pos, 0);
    else if (node.type.name === 'hardBreak') add('\n', pos, 0);
    return false;
  });
  return { text, positions };
}

/** The quote of the selected words; null when nothing but blank space is selected */
function quoteOfSelection(state: EditorState): TextQuote | null {
  const { from, to } = state.selection;
  const { text, positions } = docText(state.doc);
  const start = positions.findIndex((pos) => pos >= from);
  let end = start;
  while (end >= 0 && end < positions.length && positions[end] < to) end++;
  return start < 0 ? null : quoteAt(text, start, end);
}

interface Highlights {
  readonly decorations: DecorationSet;
  readonly found: ReadonlyArray<string>;
}

function highlights(doc: ProseMirrorNode, notes: EditorNotes | undefined): Highlights {
  if (!notes || notes.items.length === 0) return { decorations: DecorationSet.empty, found: [] };
  const { text, positions } = docText(doc);
  const located = notes.items
    .flatMap((note) => {
      const at = note.quote && locateQuote(text, note.quote);
      return at ? [{ id: note.id, ...at }] : [];
    })
    .sort((a, b) => a.start - b.start);
  const decorations = located.map(({ id, start, end }) =>
    Decoration.inline(positions[start], positions[end - 1] + 1, {
      class: id === notes.openId ? 'wp-page-note wp-page-note-open' : 'wp-page-note',
      'data-page-note': id,
    }),
  );
  return { decorations: DecorationSet.create(doc, decorations), found: located.map((note) => note.id) };
}

const key = new PluginKey<Highlights>('noteHighlights');

/** Draws the notes again after they changed, or the one open did */
export const refreshNoteHighlights = (editor: Editor) => editor.view.dispatch(editor.state.tr.setMeta(key, true));

/** Asks for a note on the selected words; false when there are no words to note */
export function noteSelection(editor: Editor, notes: EditorNotes | undefined): boolean {
  const quote = notes && quoteOfSelection(editor.state);
  if (!notes || !quote) return false;
  const start = editor.view.coordsAtPos(editor.state.selection.from);
  const end = editor.view.coordsAtPos(editor.state.selection.to);
  notes.onSelection(quote, { top: start.top, bottom: end.bottom, left: start.left, right: Math.max(start.left, end.right) });
  // The words are the note's now, highlighted: the selection, and the bubble over it, would only stand in the way
  editor.commands.setTextSelection(editor.state.selection.to);
  return true;
}

/** The notes' highlights, a click on one opening its note, and Mod-Alt-M for a note on the selection, as in Docs */
export const NoteHighlights = Extension.create<{ notes: () => EditorNotes | undefined }>({
  name: 'noteHighlights',

  addOptions() {
    return { notes: () => undefined };
  },

  addProseMirrorPlugins() {
    const notes = this.options.notes;
    return [
      new Plugin<Highlights>({
        key,
        state: {
          init: (_, state) => highlights(state.doc, notes()),
          apply: (tr, value, _old, state) => (tr.docChanged || tr.getMeta(key) ? highlights(state.doc, notes()) : value),
        },
        props: {
          decorations: (state) => key.getState(state)?.decorations,
          handleDOMEvents: {
            click: (_view, event) => {
              const passage = (event.target as HTMLElement).closest('[data-page-note]');
              if (passage) notes()?.onOpen(passage.getAttribute('data-page-note') ?? '', passage.getBoundingClientRect());
              return false;
            },
          },
        },
        view: (first) => {
          let reported = '';
          const report = (view: EditorView) => {
            const found = key.getState(view.state)?.found ?? [];
            if (found.join() === reported) return;
            reported = found.join();
            notes()?.onFound(found);
          };
          report(first);
          return { update: report };
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return { 'Mod-Alt-m': () => noteSelection(this.editor, this.options.notes()) };
  },
});
