import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** The note playing now: the line of the note for what the video shows, marked while it plays */

const activeNoteKey = new PluginKey<number | null>('activeVideoNote');

/** Marks the line of the note for what the video is showing: the time's position, or null */
export function setActiveNote(editor: Editor, pos: number | null) {
  if (activeNoteKey.getState(editor.state) === pos) return;
  editor.view.dispatch(editor.state.tr.setMeta(activeNoteKey, pos).setMeta('addToHistory', false));
}

export const activeNotePlugin = new Plugin<number | null>({
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
