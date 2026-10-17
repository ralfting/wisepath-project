'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { Drawer } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageDrawer.module.css';
import { DRAWER_WIDTH, DrawerContext, LEAVE_MS, TABBABLE } from './PageDrawer.helpers';
import type { Trail } from './PageDrawer.helpers';

/**
 * The drawer animates with CSS keyframes rather than Mantine's transition:
 * Next mounts the route while it is still hidden, which would play a
 * state-driven transition before anyone sees it. Keyframes start when the
 * drawer actually appears: a short slide with a fade, settling softly.
 */
export function PageDrawerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trail, setTrail] = useState<Trail>({ before: [], at: null });
  const cursors = useRef(new Map<string, number>()).current;
  const shown = useRef<string | null>(null);
  // Expanded, the drawer stops at the sidebar, so it lands exactly where the full page sits
  const [sidebarEdge, setSidebarEdge] = useState(0);
  const toggleExpanded = () => {
    setSidebarEdge(document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().right ?? 0);
    setExpanded((e) => !e);
  };
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // A click on an empty spot outside closes the drawer: the map's background or
  // the page around it. Controls outside keep doing their own thing (another
  // page switches the drawer, links navigate), floating layers (menus,
  // popovers, the delete modal) belong to the drawer, and a drag that panned
  // the map is not a click
  const closeRef = useRef<() => void>(() => {});
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  useEffect(() => {
    let down: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const dragged = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5;
      if (!target?.isConnected || dragged || expandedRef.current) return;
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
  closeRef.current = close;

  // The drawer comes last in the document: Tab past its end would start the whole page over (logo,
  // sidebar, map). It goes back to the page open on the map instead, where the drawer is a Tab away
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

  return (
    <Drawer.Root
      opened
      // Esc first closes a popover or menu open in the drawer (they close themselves), then shrinks
      // an expanded drawer back, then closes it
      onClose={() => {
        // Only one on screen counts: a closed Select (a code block's language) keeps its dropdown in the page, hidden
        const open = [...document.querySelectorAll('.mantine-Popover-dropdown, [role=menu]')].some((el) => el.getClientRects().length > 0);
        if (open) return;
        // Another drawer or dialog over this one (Help) takes the Esc
        const over = [...document.querySelectorAll('.mantine-Drawer-content, .mantine-Modal-content')].some(
          (el) => !el.classList.contains(classes.drawer) && el.getClientRects().length > 0,
        );
        if (over) return;
        if (expanded) setExpanded(false);
        else close();
      }}
      transitionProps={{ duration: 0 }}
      position="right"
      size={expanded ? '100%' : DRAWER_WIDTH}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      padding={0}
      shadow="xl"
      classNames={{ inner: classes.drawerInner, content: classes.drawer, body: classes.drawerBody }}
      data-leaving={leaving || undefined}
      data-expanded={expanded || undefined}
      style={{ '--drawer-left': `${sidebarEdge}px` } as CSSProperties}
    >
      {/* No overlay and no close button: the map stays usable, and the page's own top bar closes it.
          The dialog has no visible title, so it is named here for screen readers */}
      <Drawer.Content aria-label={t('page.drawer.label')}>
        <Drawer.Body>
          <DrawerContext.Provider value={{ close, expanded, toggleExpanded, trail, setTrail, cursors, shown }}>
            {children}
          </DrawerContext.Provider>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
