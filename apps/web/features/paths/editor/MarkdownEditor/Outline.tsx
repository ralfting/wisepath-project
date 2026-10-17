'use client';

import type { Editor } from '@tiptap/react';
import { Paper, Text, Transition, UnstyledButton } from '@mantine/core';
import type { MantineTransition } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import classes from './MarkdownEditor.module.css';
import { useT } from '@/i18n/I18nProvider';

/** A heading in the page's text, for the outline */
export interface Heading {
  level: number;
  text: string;
  /** Where it starts in the document */
  pos: number;
}

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
function scrollerOf(el: HTMLElement): HTMLElement | Window {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return window;
}

/** The outline's panel grows out of the rail: a short fade with a nudge from the right */
const unfold: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(6px) scale(0.98)' },
  transitionProperty: 'opacity, transform',
};

/**
 * Outline
 * The page's headings as a quiet rail on the right edge, like Notion's: one
 * dash per heading, longer for higher levels, the one being read in blue. It
 * stays in view while the text scrolls. Hovering (or a tap) opens the
 * headings by name; a click scrolls to one and puts the cursor at its end.
 * From the keyboard, Enter or ↓ on the dashes goes into the list.
 */
export function Outline({ editor, headings }: { editor: Editor; headings: ReadonlyArray<Heading> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const openBefore = useRef(false);
  const top = Math.min(...headings.map((h) => h.level));

  // The heading being read: the last one whose top has passed below the toolbar
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const scroller = scrollerOf(rail);
    let frame = 0;
    const update = () => {
      frame = 0;
      const edge = (scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top) + 80;
      let current = 0;
      headings.forEach((h, i) => {
        // Read between a change to the text and the headings that follow it, a position can land on something else
        const dom = editor.view.nodeDOM(h.pos);
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
  }, [editor, headings]);

  // From the keyboard: Enter or ↓ on the dashes goes into the list, at the heading being read; ↑ ↓ Home End move
  // through it, Esc closes it and leaves the focus on the dashes
  const dashesRef = useRef<HTMLButtonElement>(null);
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
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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

  const go = (heading: Heading) => {
    const node = editor.state.doc.nodeAt(heading.pos);
    if (!node) return;
    setOpen(false);
    editor.chain().focus(heading.pos + node.nodeSize - 1, { scrollIntoView: false }).run();
    (editor.view.nodeDOM(heading.pos) as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={classes.outlineTrack} aria-hidden={false}>
      <nav
        ref={railRef}
        aria-label={t('editor.outline.label')}
        className={classes.outline}
        data-open={open || undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // Opened by the focus coming in, not by it moving back to the dashes from the list
        onFocus={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      >
        <button
          ref={dashesRef}
          type="button"
          className={classes.outlineDashes}
          // A tap also fires mouseenter and focus, which open the panel first: toggle from how it was before the touch
          onPointerDown={() => (openBefore.current = open)}
          // Enter or Space: into the list (the focus has opened it already)
          onClick={(e) => (e.detail === 0 ? enterList() : setOpen(!openBefore.current))}
          aria-label={t('editor.outline.label')}
          aria-expanded={open}
        >
          {headings.map((h, i) => (
            <span
              key={h.pos}
              className={classes.outlineDash}
              data-level={Math.min(h.level - top, 2)}
              data-active={i === active || undefined}
            />
          ))}
        </button>
        <Transition mounted={open} transition={unfold} duration={reduceMotion ? 0 : 140} exitDuration={reduceMotion ? 0 : 90} timingFunction="ease-out">
          {(style) => (
            <div className={classes.outlinePop} style={style}>
              <Paper className={classes.outlinePanel}>
                <Text component="div" className={classes.outlineTitle} aria-hidden>
                  {t('editor.outline.title')}
                </Text>
                <ul className={classes.outlineList}>
                  {headings.map((h, i) => (
                    <li key={h.pos}>
                      <UnstyledButton
                        data-outline-item
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(h)}
                        className={classes.outlineItem}
                        data-level={Math.min(h.level - top, 2)}
                        data-active={i === active || undefined}
                        aria-current={i === active ? 'location' : undefined}
                        title={h.text}
                      >
                        <span className={classes.outlineText}>{h.text}</span>
                      </UnstyledButton>
                    </li>
                  ))}
                </ul>
              </Paper>
            </div>
          )}
        </Transition>
      </nav>
    </div>
  );
}
