'use client';

import type { ChainedCommands, Editor } from '@tiptap/react';
import type { Node as DocNode } from '@tiptap/pm/model';
import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { scrollerOf } from './Outline.helpers';
import type { OutlineEntry } from './Outline.helpers';

/** Where going to an entry puts the cursor: a heading's or a question's end of text, a video picked whole */
const PLACE: Record<OutlineEntry['kind'], (chain: ChainedCommands, node: DocNode, pos: number) => ChainedCommands> = {
  heading: (chain, node, pos) => chain.focus(pos + node.nodeSize - 1, { scrollIntoView: false }),
  question: (chain, node, pos) => chain.focus(pos + (node.firstChild?.nodeSize ?? 1), { scrollIntoView: false }),
  video: (chain, _node, pos) => chain.focus(undefined, { scrollIntoView: false }).setNodeSelection(pos),
};

/**
 * The outline's view model: whether its panel is open, the entry being read (the last whose top has passed below
 * the toolbar), the keys that move through it, and going to an entry
 */
export function useOutline({ editor, entries }: { editor: Editor; entries: ReadonlyArray<OutlineEntry> }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLElement>(null);
  const dashesRef = useRef<HTMLButtonElement>(null);
  const openBefore = useRef(false);

  // The entry being read: the last one whose top has passed below the toolbar
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const scroller = scrollerOf(rail);
    let frame = 0;
    const update = () => {
      frame = 0;
      const edge = (scroller instanceof HTMLElement ? scroller.getBoundingClientRect().top : 0) + 80;
      let current = 0;
      entries.forEach((entry, i) => {
        // Read between a change to the text and the entries that follow it, a position can land on something else
        const dom = editor.view.nodeDOM(entry.pos);
        if (dom instanceof HTMLElement && dom.getBoundingClientRect().top <= edge) current = i;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [editor, entries]);

  // From the keyboard: Enter or ↓ on the dashes goes into the list, at the entry being read; ↑ ↓ Home End move
  // through it, Esc closes it and leaves the focus on the dashes
  const items = () => [...(railRef.current?.querySelectorAll<HTMLElement>('[data-outline-item]') ?? [])];
  const enterList = () => {
    setOpen(true);
    // The list is there once the panel has started to unfold
    let tries = 0;
    const focus = () => {
      const list = items();
      const target = list[active] ?? list[0];
      if (target) target.focus();
      else if (tries++ < 10) setTimeout(focus, 30);
    };
    setTimeout(focus, 0);
  };
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      if (at >= 0) dashesRef.current?.focus();
      setOpen(false);
    } else if (at < 0) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      enterList();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      list[(at + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      list[event.key === 'Home' ? 0 : list.length - 1].focus();
    } else {
      return;
    }
    event.preventDefault();
  };

  const go = (entry: OutlineEntry) => {
    const node = editor.state.doc.nodeAt(entry.pos);
    if (!node) return;
    setOpen(false);
    PLACE[entry.kind](editor.chain(), node, entry.pos).run();
    (editor.view.nodeDOM(entry.pos) as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return {
    railRef,
    dashesRef,
    state: { open, active },
    operations: {
      open: () => setOpen(true),
      close: () => setOpen(false),
      // Opened by the focus coming in, not by it moving back to the dashes from the list
      focusIn: (event: FocusEvent<HTMLElement>) => !event.currentTarget.contains(event.relatedTarget as Node) && setOpen(true),
      focusOut: (event: FocusEvent<HTMLElement>) => !event.currentTarget.contains(event.relatedTarget as Node) && setOpen(false),
      keyDown,
      // A tap also fires mouseenter and focus, which open the panel first: toggle from how it was before the touch
      pressDashes: () => (openBefore.current = open),
      // Enter or Space: into the list (the focus has opened it already)
      clickDashes: (event: MouseEvent) => (event.detail === 0 ? enterList() : setOpen(!openBefore.current)),
      go,
    },
  };
}
