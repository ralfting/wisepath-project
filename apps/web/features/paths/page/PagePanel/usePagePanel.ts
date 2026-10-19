'use client';

import { useEffect, useState } from 'react';
import type { UIEvent } from 'react';
import { branchProgress, mapTree, relatedPages, trailTo } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { useRememberOpened } from '@/useCases/search';
import { useT } from '@/i18n/I18nProvider';
import { pointAtRelated } from '@/features/paths/path';
import { pageActionsFor } from '../PageContent/PageContent.helpers';

/** The panel's tabs: the page's text, or the pages related to it */
export type PanelTab = 'content' | 'related';

/** Scrolled this far down, the header folds; back above COMPACT_LEAVE, it unfolds */
const COMPACT_ENTER = 40;
const COMPACT_LEAVE = 8;
/** Folding only where this much is left to scroll: a shorter text would fit once folded and unfold at once */
const COMPACT_ROOM = 160;

/**
 * The page panel's view model: where the page sits on the map (its trail, what it is, what is below it), the pages
 * related to it, the open tab, its delete dialog, Enter in the title moving to the text, and the header folded while
 * the text is scrolled down (only a phone shows it folded). Opening it puts the page among the recent ones the search
 * palette offers.
 */
export function usePagePanel({ path, page, store, onSelect }: { path: Path; page: Page; store: PathActions; onSelect: (pageId: string, alternate?: boolean) => void }) {
  const t = useT();
  const [tab, setTab] = useState<PanelTab>('content');
  // Offered again by the search palette (⌘P), across paths
  useRememberOpened({ pathId: path.id, pageId: page.id, title: page.title, pathTitle: path.title });
  // A related page still pointed at when the panel goes (another page opened, the drawer closed) lets go
  useEffect(() => () => pointAtRelated(null), [page.id]);
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Kept per page, so another page opens with its header unfolded
  const [compactOn, setCompactOn] = useState<string | null>(null);

  const isRoot = page.id === path.rootPageId;
  const tree = mapTree(path);
  const isOrphan = !tree.nodes.has(page.id);
  const trail = trailTo(path, page.id, tree);
  const below = branchProgress(path, page.id);
  const branchFrom = trail.length > 1 ? trail[trail.length - 2] : null;
  // A learning path counts what below was studied; a study, how many pages are below
  const progress = path.kind === 'learningPath';
  // The main page is named by the header; under its title goes what the path is about
  const kind = isRoot ? (path.description ?? null) : t(isOrphan ? 'page.kind.orphan' : page.module ? 'page.kind.module' : 'page.kind.page');
  const belowText =
    !below || below.total === 0
      ? null
      : progress
        ? t('page.below.studied', { studied: below.studied, count: below.total })
        : t('page.below.pages', { count: below.total });

  return {
    state: {
      tab,
      compact: compactOn === page.id,
      textFocus,
      confirmingDelete,
      isRoot,
      isOrphan,
      tree,
      trail,
      below,
      progress,
      related: relatedPages(path, page.id),
      subtitle: [kind, belowText].filter(Boolean).join(' · '),
      actions: pageActionsFor(store, onSelect),
    },
    operations: {
      showTab: (next: PanelTab) => setTab(next),
      scroll: (event: UIEvent<HTMLElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        if (scrollTop < COMPACT_LEAVE) setCompactOn(null);
        else if (scrollTop > COMPACT_ENTER && scrollHeight - clientHeight > COMPACT_ROOM) setCompactOn(page.id);
      },
      // From the title: to the text, on its tab
      focusText: () => {
        setTab('content');
        setTextFocus((n) => n + 1);
      },
      confirmDelete: () => setConfirmingDelete(true),
      cancelDelete: () => setConfirmingDelete(false),
      remove: () => {
        setConfirmingDelete(false);
        store.deletePage(page.id);
        onSelect(branchFrom?.id ?? path.rootPageId);
      },
    },
  };
}
