'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotion } from '@mantine/hooks';
import { Anchor, Drawer, Stack, Text, Title } from '@mantine/core';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { openPageId, pageHref, swapOpenPage } from '@/features/shared/routes';
import { PagePanel } from './PagePanel';
import { PageSheet, pageCrumbs } from './PageEditor';
import { CrumbTrail, TopBar } from '@/features/shell/AppFrame';
import { useT } from '@/i18n/I18nProvider';
import classes from './PagePanel.module.css';

/**
 * PageDrawer
 * A page opened from the map, in a drawer over it. The URL is the page's own
 * (/projects/:id/pages/:pageId), so back closes it and a reload shows the full
 * page; the expand button grows the drawer to the whole window in place. The map behind stays usable: clicking another
 * page switches the drawer to it.
 */

export const DRAWER_WIDTH = 560;
/** Gap between the floating drawer and the window's edges */
export const DRAWER_GAP = 12;

/** Closes the drawer with its exit animation, then leaves its URL */
interface DrawerControls {
  close: () => void;
  /** Grown to the whole window, in place: no navigation, no reload */
  expanded: boolean;
  toggleExpanded: () => void;
  /** The pages walked through inside the drawer, ending at the one it shows now */
  trail: Trail;
  setTrail: (trail: Trail) => void;
  /** Where the cursor last was in each page's text, to put it back on return */
  cursors: Map<string, number>;
  /** The page the drawer showed last: the route remounts the page for each one, the drawer stays */
  shown: { current: string | null };
}
const DrawerContext = createContext<DrawerControls>({
  close: () => {},
  expanded: false,
  toggleExpanded: () => {},
  trail: { before: [], at: null },
  setTrail: () => {},
  cursors: new Map(),
  shown: { current: null },
});

/**
 * Where the drawer has been: going from page to page inside it adds the page
 * left behind, so the back arrow can return to it. A page opened some other
 * way (a click on the map) is not where the trail ends, so it starts over.
 */
interface Trail {
  before: ReadonlyArray<string>;
  at: string | null;
}

/** What Tab stops on */
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex], [contenteditable=true]';

/**
 * Whether the page is being opened from the keyboard: the control that opened it (a map node, the
 * Continue button) still has the focus, and shows it, as the browser does only for keys
 */
function openedByKeyboard(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return !!active && active !== document.body && !active.closest('.mantine-Drawer-content') && active.matches(':focus-visible');
}

/** Matches the leave animation in PagePanel.module.css */
const LEAVE_MS = 180;

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

  // The dialog is what screen readers announce, and Drawer gives it no name without a visible title
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      document.querySelector('.mantine-Drawer-content')?.setAttribute('aria-label', t('page.drawer.label')),
    );
    return () => cancelAnimationFrame(frame);
  });

  return (
    <Drawer
      opened
      // Esc first closes a popover or menu open in the drawer (they close themselves), then shrinks
      // an expanded drawer back, then closes it
      onClose={() => {
        // Only one on screen counts: a closed Select (a code block's language) keeps its dropdown in the page, hidden
        const open = [...document.querySelectorAll('.mantine-Popover-dropdown, [role=menu]')].some((el) => el.getClientRects().length > 0);
        if (open) return;
        if (expanded) setExpanded(false);
        else close();
      }}
      transitionProps={{ duration: 0 }}
      position="right"
      size={expanded ? '100%' : DRAWER_WIDTH}
      withOverlay={false}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      withCloseButton={false}
      padding={0}
      shadow="xl"
      classNames={{ inner: classes.drawerInner, content: classes.drawer, body: classes.drawerBody }}
      data-leaving={leaving || undefined}
      data-expanded={expanded || undefined}
      style={{ '--drawer-left': `${sidebarEdge}px` } as CSSProperties}
    >
      <DrawerContext.Provider value={{ close, expanded, toggleExpanded, trail, setTrail, cursors, shown }}>
        {children}
      </DrawerContext.Provider>
    </Drawer>
  );
}

export function PageDrawer({ projectId, pageId: routePageId }: { projectId: string; pageId: string }) {
  const router = useRouter();
  const t = useT();
  // The page in the URL: swapped in place (swapOpenPage) it is ahead of the route's own
  const pageId = openPageId(usePathname(), projectId) ?? routePageId;
  const { close, expanded, toggleExpanded, trail, setTrail, cursors, shown } = useContext(DrawerContext);
  const before = trail.at === pageId ? trail.before : [];
  // Ready to write on arrival. Reached from another page in the drawer: where the cursor was last, else the start.
  // Opened from the map (or just made, ?new=1): at the end of the text, to add to it
  const isNew = useSearchParams().get('new') === '1';
  const fromDrawer = trail.at === pageId && !isNew;
  // A page that replaces another in the open drawer, rather than the drawer's first
  const swap = useRef<{ id: string; swapped: boolean; byKeyboard: boolean } | null>(null);
  if (swap.current?.id !== pageId) swap.current = { id: pageId, swapped: shown.current !== null && shown.current !== pageId, byKeyboard: openedByKeyboard() };
  const swapped = swap.current.swapped;
  // Opened with the keys (from the map, say): the title takes the focus, so the page is announced and
  // the next keys don't land in its text
  const byKeyboard = swap.current.byKeyboard && !fromDrawer && !isNew;
  const cursor = byKeyboard ? null : fromDrawer ? (cursors.get(pageId) ?? 'start') : 'end';
  useEffect(() => {
    shown.current = pageId;
  }, [shown, pageId]);

  // Moving between pages replaces the entry, so back still closes the drawer in one step
  const go = (id: string) => {
    if (id === pageId) return;
    setTrail({ before: [...before, pageId], at: id });
    swapOpenPage(pageHref(projectId, id));
  };
  const goBack = (to: string, rest: ReadonlyArray<string>) => {
    setTrail({ before: rest, at: to });
    swapOpenPage(pageHref(projectId, to));
  };

  return (
    <ProjectGate projectId={projectId}>
      {(project, store, save) => {
        const page = project.pages.find((p) => p.id === pageId);
        // The page to go back to, skipping any deleted on the way
        const backIndex = before.map((id) => project.pages.some((p) => p.id === id)).lastIndexOf(true);
        const back = backIndex < 0 ? undefined : project.pages.find((p) => p.id === before[backIndex]);
        if (!page) {
          return (
            <Stack gap="sm" p="xl">
              <Title order={2} fz={22}>
                {t('page.notFound.title')}
              </Title>
              <Text c="dimmed">{t('page.notFound.body')}</Text>
              <Anchor component="button" type="button" onClick={close} fw={700} ta="left">
                {t('common.actions.close')}
              </Anchor>
            </Stack>
          );
        }
        // Expanded: the full page itself (top bar and sheet), not a stretched panel
        if (expanded) {
          return (
            <div className={classes.expanded}>
              <TopBar>
                <CrumbTrail crumbs={pageCrumbs(project, page, t)} />
              </TopBar>
              <PageSheet
                project={project}
                page={page}
                store={store}
                save={save}
                onOpenPage={go}
                back={back && { page: back, onClick: () => goBack(back.id, before.slice(0, backIndex)) }}
                focusEditor={cursor}
                onCursor={(pos) => cursors.set(page.id, pos)}
                showOnMap={{ onClick: toggleExpanded }}
                onDeleted={(back) => {
                  toggleExpanded();
                  router.replace(pageHref(project.id, back), { scroll: false });
                }}
              />
            </div>
          );
        }
        return (
          // Keyed by the page: another page slides in, so the change is seen
          <div key={page.id} className={classes.swap} data-swapped={swapped || undefined}>
          <PagePanel
            project={project}
            page={page}
            store={store}
            onSelect={go}
            focusEditor={cursor}
            focusTitle={byKeyboard}
            onCursor={(pos) => cursors.set(page.id, pos)}
            back={back && { page: back, onClick: () => goBack(back.id, before.slice(0, backIndex)) }}
            onExpand={toggleExpanded}
            onClose={close}
            flat
          />
          </div>
        );
      }}
    </ProjectGate>
  );
}
