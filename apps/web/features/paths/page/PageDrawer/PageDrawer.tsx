'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useRef } from 'react';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { PathGate } from '@/features/paths/path';
import { openPageId, pageHref, swapOpenPage } from '@/shared/routes';
import { PagePanel } from '../PagePanel/PagePanel';
import { pageCrumbs } from '../PageEditor/PageEditor.helpers';
import { PageSheet } from '../PageEditor/PageSheet';
import { CrumbTrail, TopBar } from '@/features/shell';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageDrawer.module.css';
import { DrawerContext } from './PageDrawer.helpers';
import type { Trail } from './PageDrawer.helpers';

/**
 * PageDrawer
 * A page opened from the map, in a drawer over it. The URL is the page's own
 * (/paths/:id/pages/:pageId), so back closes it and a reload shows the full
 * page; the expand button grows the drawer to the whole window in place. The map behind stays usable: clicking another
 * page switches the drawer to it.
 */

/** Gap between the floating drawer and the window's edges */
export const DRAWER_GAP = 12;

/** Closes the drawer with its exit animation, then leaves its URL */
export interface DrawerControls {
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

/**
 * Whether the page is being opened from the keyboard: the control that opened it (a map node, the
 * Continue button) still has the focus, and shows it, as the browser does only for keys
 */
function openedByKeyboard(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return !!active && active !== document.body && !active.closest('.mantine-Drawer-content') && active.matches(':focus-visible');
}

export function PageDrawer({ pathId, pageId: routePageId }: { pathId: string; pageId: string }) {
  const router = useRouter();
  const t = useT();
  // The page in the URL: swapped in place (swapOpenPage) it is ahead of the route's own
  const pageId = openPageId(usePathname(), pathId) ?? routePageId;
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
    swapOpenPage(pageHref(pathId, id));
  };
  const goBack = (to: string, rest: ReadonlyArray<string>) => {
    setTrail({ before: rest, at: to });
    swapOpenPage(pageHref(pathId, to));
  };

  return (
    <PathGate pathId={pathId}>
      {(path, store, save) => {
        const page = path.pages.find((p) => p.id === pageId);
        // The page to go back to, skipping any deleted on the way
        const backIndex = before.map((id) => path.pages.some((p) => p.id === id)).lastIndexOf(true);
        const back = backIndex < 0 ? undefined : path.pages.find((p) => p.id === before[backIndex]);
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
                <CrumbTrail crumbs={pageCrumbs(path, page, t)} />
              </TopBar>
              <PageSheet
                path={path}
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
                  router.replace(pageHref(path.id, back), { scroll: false });
                }}
              />
            </div>
          );
        }
        return (
          // Keyed by the page: another page slides in, so the change is seen
          <div key={page.id} className={classes.swap} data-swapped={swapped || undefined}>
          <PagePanel
            path={path}
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
    </PathGate>
  );
}
