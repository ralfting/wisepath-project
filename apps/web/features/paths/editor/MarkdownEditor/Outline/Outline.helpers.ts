import type { Node as DocNode } from '@tiptap/pm/model';
import type { MantineTransition } from '@mantine/core';
import { youTubeId } from '../../youtube';

/**
 * What the outline lists, in text order: the page's headings, its questions and its videos. `pos` is where the block
 * starts in the document. A question carries its place among the page's questions, which is how the domain ids it
 * (calloutsBefore); a video, its watch address, under which its title is looked up.
 */
export type OutlineEntry =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string; readonly pos: number }
  | { readonly kind: 'question'; readonly index: number; readonly text: string; readonly pos: number }
  | { readonly kind: 'video'; readonly url: string; readonly pos: number };

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * The outline's entries in one pass over the text. A question reads as its first block, often a small heading, so
 * that heading is listed once, as the question. Code blocks are not looked into.
 */
export function entriesOf(doc: DocNode): OutlineEntry[] {
  const found: OutlineEntry[] = [];
  let questions = 0;
  let questionEnd = -1;
  doc.descendants((node, pos) => {
    const type = node.type.name;
    if (type === 'callout' && node.attrs.kind === 'question') {
      const text = oneLine(node.firstChild?.textContent ?? '');
      // Every question counts, an empty one too, or the ones after it would take the wrong id
      if (text) found.push({ kind: 'question', index: questions, text, pos });
      questions++;
      questionEnd = Math.max(questionEnd, pos + node.nodeSize);
      return true;
    }
    if (type === 'heading') {
      const text = oneLine(node.textContent);
      if (text && pos >= questionEnd) found.push({ kind: 'heading', level: node.attrs.level as number, text, pos });
      return false;
    }
    if (type === 'youtube') {
      const id = youTubeId(node.attrs.src as string);
      if (id) found.push({ kind: 'video', url: `https://www.youtube.com/watch?v=${id}`, pos });
      return false;
    }
    return type !== 'codeBlock';
  });
  return found;
}

/** Keeps the same list while nothing in it changed, so typing elsewhere does not redraw the outline */
export function sameEntries(current: ReadonlyArray<OutlineEntry>, next: OutlineEntry[]): ReadonlyArray<OutlineEntry> {
  return current.length === next.length && current.every((entry, i) => JSON.stringify(entry) === JSON.stringify(next[i])) ? current : next;
}

/**
 * How far in each entry sits: headings by level below the page's highest, up to two steps; a question or a video
 * one step under the heading before it, or at the top before any heading
 */
export function depthsOf(entries: ReadonlyArray<OutlineEntry>): number[] {
  const levels = entries.flatMap((entry) => (entry.kind === 'heading' ? [entry.level] : []));
  const top = Math.min(...levels);
  let under = -1;
  return entries.map((entry) => {
    if (entry.kind !== 'heading') return under + 1;
    under = Math.min(entry.level - top, 2);
    return under;
  });
}

/** The nearest ancestor that scrolls, or the window */
export function scrollerOf(el: HTMLElement): HTMLElement | Window {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return window;
}

/**
 * Where the outline goes: its entries listed beside the full page when the window has room for them, its dashes
 * in the margin just past the page's edge when it has room for those, else its dashes inside the page's edge (the
 * drawer, a narrow window). A note's card takes the room beside the page while it is open.
 */
export type OutlinePlace = 'list' | 'margin' | 'inside';

/** The room right of the page, in rem, the list and the dashes need: their width in Outline.module.css and the gaps */
const LIST_ROOM = 18;
const MARGIN_ROOM = 3.5;

/** `room` is the rem right of the full page; null outside one */
export const outlinePlace = (room: number | null, noteOpen: boolean): OutlinePlace =>
  room === null || noteOpen ? 'inside' : room >= LIST_ROOM ? 'list' : room >= MARGIN_ROOM ? 'margin' : 'inside';

/** The outline's panel grows out of the rail: a short fade with a nudge from the right */
export const unfold: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(6px) scale(0.98)' },
  transitionProperty: 'opacity, transform',
};
