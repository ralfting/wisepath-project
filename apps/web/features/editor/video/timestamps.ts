import { InputRule, Node, mergeAttributes } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { videoAbove } from './videos';

/**
 * Timestamps
 * A moment of a video, written [01:25] (or [1:02:15] past an hour). In the
 * editor it is a small chip: a click plays the video above it from there. The
 * notes taken while watching are a list of them right below the video, kept in
 * time order. Stored in markdown exactly as written, brackets unescaped.
 */

/** [01:25], [1:25] or [1:02:15] */
const TIME = String.raw`\[((?:\d{1,2}:)?[0-5]?\d:[0-5]\d)\]`;

/** "01:25" or "1:02:15" for a number of seconds */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** Seconds in "01:25" or "1:02:15" */
export function parseTime(text: string): number {
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

interface MarkdownState {
  write: (text: string) => void;
}

export const Timestamp = Node.create({
  name: 'timestamp',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      time: {
        default: '00:00',
        parseHTML: (el) => el.getAttribute('data-timestamp') ?? '00:00',
        renderHTML: (attrs) => ({ 'data-timestamp': attrs.time }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-timestamp]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // A control: announced as one, with what it does; from the keyboard, ⌘↵ on its line plays it
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'wp-timestamp',
        role: 'button',
        'aria-label': `Play video from ${node.attrs.time}`,
        'aria-keyshortcuts': 'Meta+Enter Control+Enter',
        title: `Play from ${node.attrs.time} (⌘↵ on this line)`,
      }),
      node.attrs.time,
    ];
  },

  renderText({ node }) {
    return `[${node.attrs.time}]`;
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { time: string } }) {
          state.write(`[${node.attrs.time}]`);
        },
        parse: {
          // [01:25] in text becomes a chip; code stays as written. Text saved escaped (\[01:25\]) reads the same
          updateDOM(element: HTMLElement) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            const targets: Text[] = [];
            while (walker.nextNode()) {
              const text = walker.currentNode as Text;
              if (text.parentElement?.closest('code, pre')) continue;
              if (new RegExp(TIME).test(text.data)) targets.push(text);
            }
            for (const text of targets) {
              const fragment = document.createDocumentFragment();
              let last = 0;
              for (const match of Array.from(text.data.matchAll(new RegExp(TIME, 'g')))) {
                const index = match.index ?? 0;
                fragment.append(text.data.slice(last, index));
                const span = document.createElement('span');
                span.setAttribute('data-timestamp', match[1]);
                fragment.append(span);
                last = index + match[0].length;
              }
              fragment.append(text.data.slice(last));
              text.replaceWith(fragment);
            }
          },
        },
      },
    };
  },

  // ⌘↵ (Ctrl+Enter) plays the time on the cursor's line: the last one before the cursor, else the first.
  // ⇧⌘↵ plays it in fullscreen, with the notes
  addKeyboardShortcuts() {
    const play = (fullscreen: boolean) => {
      const $from = this.editor.state.doc.resolve(cursorPos(this.editor));
      const line = $from.parent;
      const start = $from.start();
      let chosen: { pos: number; time: string } | null = null;
      line.forEach((child, offset) => {
        if (child.type.name !== this.name) return;
        const pos = start + offset;
        if (!chosen || pos < $from.pos) chosen = { pos, time: child.attrs.time };
      });
      if (!chosen) return false;
      const { pos, time } = chosen;
      const video = videoAbove(this.editor, pos);
      if (!video) return false;
      video.seek(parseTime(time), fullscreen);
      return true;
    };
    return {
      'Mod-Enter': () => play(false),
      'Mod-Shift-Enter': () => play(true),
    };
  },

  // Typing [02:10] makes the chip
  addInputRules() {
    return [
      new InputRule({
        find: new RegExp(`${TIME}$`),
        handler: ({ range, match, chain }) => {
          chain().deleteRange(range).insertContent({ type: this.name, attrs: { time: match[1] } }).run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      // A press on a time plays the video above it from there (with Shift, in fullscreen), without selecting
      // the chip (and opening the formatting menu) or moving the cursor
      new Plugin({
        key: new PluginKey('timestampClick'),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const chip = (event.target as HTMLElement | null)?.closest?.('[data-timestamp]');
              if (!chip || event.button !== 0) return false;
              const video = videoAbove(editor, view.posAtDOM(chip, 0));
              if (!video) return false;
              event.preventDefault();
              video.seek(parseTime(chip.getAttribute('data-timestamp') ?? '0'), event.shiftKey);
              return true;
            },
          },
        },
      }),
      activeNotePlugin,
    ];
  },
});

/**
 * Where the cursor is, read from the page's own selection: a shortcut pressed right after a click can come
 * before the editor has caught up with the selection, and would act on where the cursor was before
 */
function cursorPos(editor: Editor): number {
  const { view } = editor;
  const selection = window.getSelection();
  const node = selection?.focusNode;
  if (!node || !view.dom.contains(node)) return view.state.selection.from;
  try {
    return view.posAtDOM(node, selection.focusOffset);
  } catch {
    return view.state.selection.from;
  }
}

/* ---------- The notes under a video ---------- */

export interface VideoNote {
  /** Where the time sits in the document */
  pos: number;
  seconds: number;
  time: string;
  /** The note's line: without the time when it opens it, with it when the time is mid-sentence */
  text: string;
}

/** A line's text, times written out; the time that opens it is left out, the chip shows it */
function lineText(line: PMNode, own: PMNode): string {
  let text = '';
  line.forEach((child, _offset, index) => {
    if (child === own && index === 0) return;
    text += child.type.name === 'timestamp' ? child.attrs.time : child.isText ? child.text : child.textContent;
  });
  return text.trim();
}

/** The times written below a video, up to the next one, in the order they appear */
export function notesAfter(doc: PMNode, videoPos: number): VideoNote[] {
  const video = doc.nodeAt(videoPos);
  if (!video) return [];
  const notes: VideoNote[] = [];
  let pos = videoPos + video.nodeSize;
  for (let index = doc.resolve(pos).index(); index < doc.childCount; index++) {
    const block = doc.child(index);
    if (block.type.name === 'youtube') break;
    block.descendants((node, offset, parent) => {
      if (node.type.name !== 'timestamp' || !parent) return;
      const time = node.attrs.time as string;
      notes.push({ pos: pos + 1 + offset, seconds: parseTime(time), time, text: lineText(parent, node) });
    });
    pos += block.nodeSize;
  }
  return notes;
}

/** The note for this moment: the last one whose time has come */
export function noteAt(notes: ReadonlyArray<VideoNote>, seconds: number): VideoNote | undefined {
  let current: VideoNote | undefined;
  for (const note of notes) if (note.seconds <= seconds + 0.25 && (!current || note.seconds >= current.seconds)) current = note;
  return current;
}

/**
 * Adds "[01:25] text" to the list right below the video, where its time puts
 * it among the others; makes the list if there is none yet
 */
export function addNote(editor: Editor, videoPos: number, seconds: number, text: string) {
  const { state } = editor;
  const { schema, doc } = state;
  const video = doc.nodeAt(videoPos);
  if (!video) return;
  const after = videoPos + video.nodeSize;
  const content = [schema.nodes.timestamp.create({ time: formatTime(seconds) }), ...(text.trim() ? [schema.text(` ${text.trim()}`)] : [])];
  const item = schema.nodes.listItem.create(null, schema.nodes.paragraph.create(null, content));
  const list = doc.nodeAt(after);

  const tr = state.tr;
  if (list?.type.name !== 'bulletList') {
    tr.insert(after, schema.nodes.bulletList.create(null, item));
  } else {
    // Before the first item whose time is later; items without a time don't count
    let insertAt = after + list.nodeSize - 1;
    let offset = after + 1;
    for (let i = 0; i < list.childCount; i++) {
      const first = list.child(i).firstChild?.firstChild;
      if (first?.type.name === 'timestamp' && parseTime(first.attrs.time) > seconds) {
        insertAt = offset;
        break;
      }
      offset += list.child(i).nodeSize;
    }
    tr.insert(insertAt, item);
  }
  editor.view.dispatch(tr.scrollIntoView());
}

/* ---------- The note playing now ---------- */

const activeNoteKey = new PluginKey<number | null>('activeVideoNote');

/** Marks the line of the note for what the video is showing: the time's position, or null */
export function setActiveNote(editor: Editor, pos: number | null) {
  if (activeNoteKey.getState(editor.state) === pos) return;
  editor.view.dispatch(editor.state.tr.setMeta(activeNoteKey, pos).setMeta('addToHistory', false));
}

const activeNotePlugin = new Plugin<number | null>({
  key: activeNoteKey,
  state: {
    init: () => null,
    apply(tr, pos) {
      const next = tr.getMeta(activeNoteKey);
      if (next !== undefined) return next as number | null;
      if (pos === null) return null;
      const mapped = tr.mapping.mapResult(pos);
      return mapped.deleted ? null : mapped.pos;
    },
  },
  props: {
    decorations(state: EditorState) {
      const pos = activeNoteKey.getState(state);
      if (pos === null || pos === undefined || pos > state.doc.content.size) return null;
      const $pos = state.doc.resolve(pos);
      if ($pos.depth === 0) return null;
      return DecorationSet.create(state.doc, [Decoration.node($pos.before(), $pos.after(), { class: 'wp-note-active' })]);
    },
  },
});
