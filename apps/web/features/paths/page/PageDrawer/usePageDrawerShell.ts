'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { LEAVE_MS, TABBABLE } from './PageDrawer.helpers';
import type { Trail } from './PageDrawer.helpers';
import type { DrawerControls } from './PageDrawer.helpers';

/**
 * The page drawer's view model: whether it is leaving or expanded, the trail of pages inside it, closing it (with
 * its leave animation unless motion is reduced), and what Esc does. `ownContentClass` tells this drawer's content
 * apart from another drawer or dialog over it.
 */
export function usePageDrawerShell({ ownContentClass }: { ownContentClass: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trail, setTrail] = useState<Trail>({ before: [], at: null });
  const cursors = useRef(new Map<string, number>()).current;
  const shown = useRef<string | null>(null);
  // Expanded, the drawer stops at the sidebar, so it lands exactly where the full page sits
  const [sidebarEdge, setSidebarEdge] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const toggleExpanded = () => {
    setSidebarEdge(document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().right ?? 0);
    setExpanded((e) => !e);
  };

  // Back to the map entry the drawer was opened from, or to the map when there is none
  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push(window.location.pathname.replace(/\/pages\/[^/]+$/, ''));
  };
  const close = () => {
    if (leaving) return;
    if (reduceMotion) return leave();
    setLeaving(true);
    timer.current = setTimeout(leave, LEAVE_MS);
  };

  useCloseOnClickOutside(close, () => expanded);
  useTabFromEndToMap();

  // Esc first closes a popover or menu open in the drawer (they close themselves), then shrinks an expanded drawer
  // back, then closes it
  const escape = () => {
    // A fullscreen video takes the Esc: it cancels its note, else leaves fullscreen
    if (document.fullscreenElement) return;
    // Only one on screen counts: a closed Select (a code block's language) keeps its dropdown in the page, hidden
    const open = [...document.querySelectorAll('.mantine-Popover-dropdown, [role=menu]')].some((el) => el.getClientRects().length > 0);
    if (open) return;
    // A note written in place, in the Notes tab, closes on Esc instead
    if (document.activeElement?.closest('[data-note-writing]')) return;
    // Another drawer or dialog over this one (Help) takes the Esc
    const over = [...document.querySelectorAll('.mantine-Drawer-content, .mantine-Modal-content')].some(
      (el) => !el.classList.contains(ownContentClass) && el.getClientRects().length > 0,
    );
    if (over) return;
    if (expanded) setExpanded(false);
    else close();
  };

  const controls: DrawerControls = { close, expanded, toggleExpanded, trail, setTrail, cursors, shown };
  return { state: { leaving, expanded, sidebarEdge, controls }, operations: { escape } };
}

/**
 * A click on an empty spot outside closes the drawer: the map's background or the page around it. Controls outside
 * keep doing their own thing (another page switches the drawer, links navigate), floating layers (menus, popovers,
 * the delete modal) belong to the drawer, and a drag that panned the map is not a click
 */
function useCloseOnClickOutside(close: () => void, isExpanded: () => boolean) {
  // The latest of both, read when a click comes, so the listener is added once
  const closeRef = useRef(close);
  closeRef.current = close;
  const isExpandedRef = useRef(isExpanded);
  isExpandedRef.current = isExpanded;
  useEffect(() => {
    let down: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const dragged = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5;
      if (!target?.isConnected || dragged || isExpandedRef.current()) return;
      if (target.closest('.mantine-Drawer-content, [data-portal], [role=dialog], [role=menu], [role=listbox]')) return;
      if (target.closest('a, button, input, textarea, select, label, [role=tab], [contenteditable=true]')) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);
}

/**
 * The drawer comes last in the document: Tab past its end would start the whole page over (logo, sidebar, map). It
 * goes back to the page open on the map instead, where the drawer is a Tab away
 */
function useTabFromEndToMap() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.defaultPrevented) return;
      const drawer = (event.target as Element).closest?.('.mantine-Drawer-content');
      if (!drawer) return;
      const tabbable = [...drawer.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
      if (!tabbable.at(-1)?.contains(event.target as Node)) return;
      const node = document.querySelector<HTMLElement>('[role=tree] [tabindex="0"]');
      if (!node) return;
      event.preventDefault();
      node.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
