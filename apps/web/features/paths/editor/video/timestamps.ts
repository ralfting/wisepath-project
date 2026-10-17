import { InputRule, Node, mergeAttributes } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Translate } from '@/i18n/I18nProvider';
import { activeNotePlugin } from './activeNote';
import { videoAbove } from './videos';

/**
 * Timestamps
 * A moment of a video, written [01:25] (or [1:02:15] past an hour). In the
 * editor it is a small chip: a click plays the video above it from there. The
 * notes taken while watching are a list of them right below the video, kept in
 * time order (videoNotes.ts). Stored in markdown exactly as written, brackets unescaped.
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

/** What a chip says to assistive tech and on hover, for its time */
export interface TimestampLabels {
  readonly label: string;
  readonly title: string;
}

export interface TimestampOptions {
  /** The chip's words for a time; the editor passes them in its language. English until it does */
  labels: (time: string) => TimestampLabels;
}

/** The chip's words in the app's language, for the editor to pass in: labels: (time) => timestampLabels(t, time) */
export const timestampLabels = (t: Translate, time: string): TimestampLabels => ({
  label: t('video.timestamp.play', { time }),
  title: t('video.timestamp.title', { time }),
});

interface MarkdownState {
  write: (text: string) => void;
}

export const Timestamp = Node.create<TimestampOptions>({
  name: 'timestamp',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      labels: (time: string) => ({ label: `Play video from ${time}`, title: `Play from ${time} (⌘↵ on this line)` }),
    };
  },

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
    const { label, title } = this.options.labels(node.attrs.time);
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'wp-timestamp',
        role: 'button',
        'aria-label': label,
        'aria-keyshortcuts': 'Meta+Enter Control+Enter',
        title,
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
