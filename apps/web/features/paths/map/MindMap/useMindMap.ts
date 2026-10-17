'use client';

import { useMemo } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { descendants, lookOf, mapTree, progressOf } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { layoutMind, rootShape } from '../mindLayout';
import type { PlacedNode } from '../mindLayout';
import { STATUS_KEY } from '../StatusIcon';
import type { TopicStatus } from '../StatusIcon';
import { useMindHighlights } from './useMindHighlights';
import { useMindKeys } from './useMindKeys';
import { useMindViewport } from './useMindViewport';
import type { FocusRequest } from './MindMap';

/**
 * The mind map's view model: the path laid out from its [[links]], its viewport, what it singles out, its keys, and
 * what each page shows (status, what is below it, how a screen reader names it)
 */
export function useMindMap({
  path,
  selectedId,
  currentId,
  progress,
  matchIds,
  searchActiveId,
  focusRequest,
  coveredRight,
  onIntent,
  onAddBranch,
  branchFrom,
}: {
  path: Path;
  selectedId: string | null;
  currentId: string | null;
  progress: boolean;
  matchIds: ReadonlySet<string> | null;
  searchActiveId: string | null;
  focusRequest: FocusRequest | null;
  coveredRight: number;
  onIntent?: (pageId: string) => void;
  onAddBranch?: (pageId: string) => void;
  branchFrom: string | null;
}) {
  const t = useT();
  const tree = useMemo(() => mapTree(path), [path]);
  const root = useMemo(() => rootShape(displayTitle(tree.root.page)), [tree]);
  const layout = useMemo(() => layoutMind(tree, root), [tree, root]);
  const rootId = tree.root.page.id;

  const viewport = useMindViewport({ tree, layout, coveredRight, focusRequest, branchFrom });
  const highlights = useMindHighlights({ selectedId, matchIds, searchActiveId, onIntent });
  const keys = useMindKeys({ tree, layout, selectedId, currentId, onAddBranch, frameOn: viewport.operations.frameOn });

  const placed = useMemo(() => new Map(layout.nodes.map((n) => [n.page.id as string, n])), [layout.nodes]);
  const statusOf = (page: Page): TopicStatus => (page.studied ? 'done' : page.id === currentId ? 'current' : 'todo');
  const counterOf = (id: Page['id']) => {
    const node = tree.nodes.get(id);
    return node ? progressOf(descendants(node)) : { studied: 0, total: 0 };
  };
  /** What a branch holds: studied of all in a learning path, how many pages in a study */
  const countText = (c: { studied: number; total: number }) => (progress ? `${c.studied}/${c.total}` : t('map.pages', { count: c.total }));
  /** A page as a screen reader hears it: its title, a module, its status, what is below it */
  const labelOf = (n: PlacedNode, status: TopicStatus, counter: { studied: number; total: number } | null) =>
    [
      displayTitle(n.page),
      n.module ? t('map.mind.module') : null,
      progress ? t(STATUS_KEY[status]).toLowerCase() : null,
      counter
        ? progress
          ? t('map.mind.belowStudied', { studied: counter.studied, count: counter.total })
          : t('map.mind.pagesBelow', { count: counter.total })
        : null,
    ]
      .filter(Boolean)
      .join(', ');

  // The + sits on a page's outer edge, the way its branches grow; the root's on the side with fewer branches
  const rootSide =
    layout.nodes.filter((n) => n.depth === 1 && n.side === 1).length <= layout.nodes.filter((n) => n.depth === 1 && n.side === -1).length ? 1 : -1;
  // Where the name field goes: under the page it adds to, in the viewport's own pixels
  const view = viewport.state.view;
  const promptAt = (() => {
    if (!branchFrom || !view) return null;
    if (branchFrom === rootId) return { left: view.x + (-root.w / 2) * view.k, top: view.y + (root.h / 2) * view.k + 8 };
    const n = placed.get(branchFrom);
    if (!n) return null;
    const left = n.side === 1 ? n.inner.x : n.inner.x - n.w;
    return { left: view.x + left * view.k, top: view.y + (n.inner.y + n.h / 2) * view.k + 8 };
  })();

  return {
    viewport,
    highlights,
    keys,
    state: { tree, root, layout, rootId, rootSide, promptAt, rootLook: lookOf(path, rootId, tree), overall: progressOf(descendants(tree.root)) },
    statusOf,
    counterOf,
    countText,
    labelOf,
  };
}
