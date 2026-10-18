'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Path } from '@wisepath/domain/paths';
import { lookOf, nextPage, pathProgress } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { openPageId, pageHref, swapOpenPage } from '@/shared/routes';
import type { FocusRequest } from '../MindMap/MindMap';
import type { View } from './PathMap.helpers';
import { ghostTitle, isGhost } from '../ghosts';
import { useBranch } from './useBranch';
import { useMapSearch } from './useMapSearch';

/**
 * A loaded map's view model: the page open in the drawer (opening one, and bringing it into view), the map or the
 * list, a learning path's progress and the page to continue with, the search, and adding branches
 */
export function useMapView({ path, actions }: { path: Path; actions: PathActions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A phone opens the outline: the drawing needs room to read; the map renders only in the browser, so the width is known
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'map',
  );
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const bringIntoView = useCallback((pageId: string) => setFocusRequest((r) => ({ pageId, nonce: (r?.nonce ?? 0) + 1 })), []);
  const selectedId = openPageId(pathname, path.id);

  // Opening the drawer adds a history entry (back closes it); moving between pages replaces it
  const select = useCallback(
    (pageId: string, fresh = false) => {
      // A page just made opens with the cursor in its text, ready to write
      const href = `${pageHref(path.id, pageId)}${fresh ? '?new=1' : ''}`;
      // With the drawer open, the page changes in place at once; opening it is a navigation
      if (selectedId) swapOpenPage(href);
      else router.push(href, { scroll: false });
    },
    [router, path.id, selectedId],
  );

  // Whatever opened the page (a click, search, the drawer's related pages), bring it into view
  useEffect(() => {
    if (selectedId) bringIntoView(selectedId);
  }, [selectedId, bringIntoView]);

  // ?open=<page> from a link outside the map: drop it from this entry, then open the drawer
  // (&new=1, for a page just made, carries over: the drawer puts the cursor in its text)
  const toOpen = searchParams.get('open');
  const isNew = searchParams.get('new') === '1';
  useEffect(() => {
    if (!toOpen) return;
    window.history.replaceState(null, '', pathname);
    router.push(`${pageHref(path.id, toOpen)}${isNew ? '?new=1' : ''}`, { scroll: false });
  }, [toOpen, isNew, pathname, path.id, router]);

  const search = useMapSearch({ path, select, bringIntoView });
  const branch = useBranch({ path, actions, select, bringIntoView });

  // A study has no progress and nothing to continue; a learning path has both
  const progress = path.kind === 'learningPath';
  const next = progress ? nextPage(path) : undefined;

  return {
    search,
    branch,
    state: { view, selectedId, focusRequest, progress, next, ...pathProgress(path), look: lookOf(path, path.rootPageId) },
    operations: {
      setView,
      // A ghost page is made as it is opened: its [[link]] is already written, so it joins the map in its place
      select: (pageId: string, alternate = false) => {
        if (isGhost(pageId)) return select(actions.createPage(ghostTitle(pageId)).id, true);
        // With Cmd/Ctrl, as a full page: loaded whole, since moving there within the app would open the drawer
        if (alternate) return window.location.assign(pageHref(path.id, pageId));
        select(pageId);
      },
      continueStudying: () => next && select(next.id),
      prefetch: (pageId: string) => router.prefetch(pageHref(path.id, pageId)),
    },
  };
}
