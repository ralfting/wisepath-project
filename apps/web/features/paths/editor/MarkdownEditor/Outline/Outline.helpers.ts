import type { Editor } from '@tiptap/react';
import type { MantineTransition } from '@mantine/core';

/** A heading in the page's text, for the outline */
export interface Heading {
  level: number;
  text: string;
  /** Where it starts in the document */
  pos: number;
}

/** The page's headings in order, with any text; code blocks are not looked into */
export function headingsOf(editor: Editor): Heading[] {
  const found: Heading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim();
      if (text) found.push({ level: node.attrs.level as number, text, pos });
      return false;
    }
    return node.type.name !== 'codeBlock';
  });
  return found;
}

/** Keeps the same list while only positions move, so typing elsewhere does not redraw the outline */
export function sameHeadings(current: ReadonlyArray<Heading>, next: Heading[]): ReadonlyArray<Heading> {
  const same = current.length === next.length && current.every((h, i) => h.level === next[i].level && h.text === next[i].text && h.pos === next[i].pos);
  return same ? current : next;
}

/** The nearest ancestor that scrolls, or the window */
export function scrollerOf(el: HTMLElement): HTMLElement | Window {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return window;
}

/**
 * Where the outline goes: its headings listed beside the full page when the window has room for them, its dashes
 * in the margin just past the page's edge when it has room for those, else its dashes inside the page's edge (the
 * drawer, a narrow window). A note's card takes the room beside the page while it is open.
 */
export type OutlinePlace = 'list' | 'margin' | 'inside';

/** The room right of the page, in px, the list (its width and the gaps around it) and the dashes need */
const LIST_ROOM = 288;
const MARGIN_ROOM = 56;

export const outlinePlace = (room: number, noteOpen: boolean): OutlinePlace =>
  noteOpen ? 'inside' : room >= LIST_ROOM ? 'list' : room >= MARGIN_ROOM ? 'margin' : 'inside';

/** The outline's panel grows out of the rail: a short fade with a nudge from the right */
export const unfold: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(6px) scale(0.98)' },
  transitionProperty: 'opacity, transform',
};
