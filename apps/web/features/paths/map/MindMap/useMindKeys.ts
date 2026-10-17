'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MapTree } from '@wisepath/domain/paths';
import type { MindLayout } from '../mindLayout';
import { neighbourOf } from './MindMap.helpers';

/**
 * The mind map as one stop for Tab, like a tree: the arrow keys move between its pages (neighbourOf), N starts a
 * branch, Enter opens. One page holds the tab stop; closing the drawer gives the focus back to the page that was open.
 */
export function useMindKeys({
  tree,
  layout,
  selectedId,
  currentId,
  onAddBranch,
  frameOn,
}: {
  tree: MapTree;
  layout: MindLayout;
  selectedId: string | null;
  currentId: string | null;
  onAddBranch?: (pageId: string) => void;
  frameOn: (pageId: string) => void;
}) {
  const rootId = tree.root.page.id;
  const [rovingId, setRovingId] = useState<string | null>(null);
  const onMap = (id: string | null) => !!id && (id === rootId || layout.nodes.some((n) => n.page.id === id));
  const tabStop = [rovingId, selectedId, currentId].find(onMap) ?? rootId;
  const focusPage = (id: string) => {
    setRovingId(id);
    document.querySelector<HTMLElement>(`[data-page-id="${id}"]`)?.focus({ preventScroll: true });
  };

  const keyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const from = (event.target as HTMLElement).closest<HTMLElement>('[data-page-id]')?.dataset.pageId;
    if (from && onAddBranch && event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      onAddBranch(from);
      return;
    }
    if (!from || !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const to = neighbourOf(layout, tree, from, event.key);
    if (!to) return;
    focusPage(to);
    frameOn(to);
  };

  // Closing the drawer takes the focus with it: give it back to the page that was open, so the keyboard goes on
  // from there instead of from the top of the window
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId) {
      lastOpen.current = selectedId;
      return;
    }
    const was = lastOpen.current;
    if (!was) return;
    const timer = setTimeout(() => {
      const focus = document.activeElement;
      if (focus && focus !== document.body) return;
      focusPage(was);
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedId]);

  return {
    keyDown,
    /** What makes a page a tree item: its level, whether it is open, and whether it holds the tab stop */
    itemOf: (id: string, level: number, expanded: boolean) => ({
      role: 'treeitem',
      'aria-level': level,
      'aria-selected': selectedId === id,
      'aria-expanded': expanded || undefined,
      tabIndex: id === tabStop ? 0 : -1,
      onFocusCapture: () => setRovingId(id),
      'aria-keyshortcuts': onAddBranch ? 'N' : undefined,
    }),
  };
}
