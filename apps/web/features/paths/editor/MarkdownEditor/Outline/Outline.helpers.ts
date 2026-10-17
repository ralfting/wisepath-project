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

/** The outline's panel grows out of the rail: a short fade with a nudge from the right */
export const unfold: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(6px) scale(0.98)' },
  transitionProperty: 'opacity, transform',
};
