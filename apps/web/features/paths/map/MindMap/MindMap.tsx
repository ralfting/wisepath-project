'use client';

import type { ReactNode } from 'react';
import type { Path } from '@wisepath/domain/paths';
import { lookOf } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { PageGlyph } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from './MindMap.module.css';
import { BranchPlus } from './BranchPlus';
import { MapTools } from './MapTools';
import { MindLines } from './MindLines';
import { MindNode } from './MindNode';
import { RootNode } from './RootNode';
import { isGhost } from '../ghosts';
import { GhostNode } from './GhostNode';
import { useMindMap } from './useMindMap';

export interface FocusRequest {
  pageId: string;
  nonce: number;
}

/** What the map shows and how it answers */
interface MindMapProps {
  path: Path;
  selectedId: string | null;
  /** The page "Continue studying" leads to */
  currentId: string | null;
  /** A learning path shows what was studied; a study shows its pages plainly, with counts */
  progress: boolean;
  /** Pages matching the search; null when not searching */
  matchIds: ReadonlySet<string> | null;
  /** The search result marked in its list (by the pointer or the arrow keys) */
  searchActiveId?: string | null;
  focusRequest: FocusRequest | null;
  /** Width covered on the right (by the page drawer); focusing centres pages in what is left */
  coveredRight?: number;
  /** `alternate`: opened with Cmd/Ctrl, as a full page */
  onSelect: (pageId: string, alternate?: boolean) => void;
  /** The pointer or focus rests on a page: a good moment to load it ahead of the click */
  onIntent?: (pageId: string) => void;
  /** Shown in the map's top-left corner (the search) */
  topLeft?: ReactNode;
  /** The + on a page, and N: start adding a page branching from it */
  onAddBranch?: (pageId: string) => void;
  /** The page a branch is being added to, and the name field shown under it */
  branch?: { from: string; prompt: ReactNode } | null;
  /** The map sits in a page that scrolls, so a plain wheel scrolls the page; Ctrl/⌘ + wheel and a pinch still zoom, dragging still pans */
  inScrollingPage?: boolean;
}

/**
 * The path read from its [[links]]: root in the middle, branches level by
 * level outward, modules drawn larger, other links as blue arrows, citations
 * as dashed grey lines. Pages no link reaches are not drawn (the header lists
 * them, see MapOrphans). Drag or
 * scroll to pan, pinch or Ctrl/⌘ + scroll to zoom. Every page is a button.
 * Pointing at a page (or focusing it) shows a + on its outer edge that adds a
 * page branching from it; N does the same from the keyboard.
 */
export function MindMap({
  path,
  selectedId,
  currentId,
  progress,
  matchIds,
  searchActiveId = null,
  focusRequest,
  coveredRight = 0,
  onSelect,
  onIntent,
  topLeft,
  onAddBranch,
  branch = null,
  inScrollingPage = false,
}: MindMapProps) {
  const t = useT();
  const mind = useMindMap({
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
    branchFrom: branch?.from ?? null,
    inScrollingPage,
  });
  const { viewport, highlights, keys } = mind;
  const { tree, root, layout, rootId, rootSide, promptAt, rootLook, overall } = mind.state;
  const view = viewport.state.view;
  const plus = (pageId: string, title: string, x: number, y: number) =>
    onAddBranch && <BranchPlus key={`plus-${pageId}`} pageId={pageId} title={title} x={x} y={y} onAdd={onAddBranch} />;

  return (
    <div className={classes.frame}>
      {/* Top left: what the page puts here (the search); first in the tab order, before the map's pages */}
      <div className={classes.topLeft}>{topLeft}</div>
      <div
        ref={viewport.viewport}
        className={classes.viewport}
        onPointerDown={viewport.operations.pointerDown}
        onPointerMove={viewport.operations.pointerMove}
        onPointerUp={viewport.operations.pointerUp}
        onPointerCancel={viewport.operations.pointerUp}
        data-dragging={viewport.state.dragging || undefined}
      >
        {view && (
          <div
            className={classes.stage}
            role="tree"
            aria-label={t('map.mind.label', { title: displayTitle(tree.root.page) })}
            onKeyDown={keys.keyDown}
            data-animate={viewport.state.animate || undefined}
            onTransitionEnd={viewport.operations.settled}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          >
            <MindLines
              path={path}
              tree={tree}
              layout={layout}
              dimmed={highlights.dimmed}
              isPointedLink={highlights.isPointedLink}
              arrowActive={highlights.arrowActive}
            />
            <RootNode
              shape={root}
              page={tree.root.page}
              color={rootLook.color}
              icon={<PageGlyph icon={rootLook.icon} size={24} />}
              studied={overall.studied}
              total={overall.total}
              progress={progress}
              selected={selectedId === rootId}
              dimmed={highlights.dimmed(rootId)}
              mark={highlights.markOf(rootId)}
              item={keys.itemOf(rootId, 1, tree.root.children.length > 0)}
              onSelect={onSelect}
              onIntent={onIntent}
            />
            {plus(rootId, displayTitle(tree.root.page), (rootSide * root.w) / 2, 0)}
            {layout.nodes.map((n) => {
              if (isGhost(n.page.id)) {
                return (
                  <GhostNode
                    key={n.page.id}
                    node={n}
                    selected={selectedId === n.page.id}
                    item={keys.itemOf(n.page.id, n.depth + 1, false)}
                    onSelect={onSelect}
                  />
                );
              }
              const status = mind.statusOf(n.page);
              const counter = mind.counterOf(n.page.id);
              const node = (
                <MindNode
                  key={n.page.id}
                  node={n}
                  look={lookOf(path, n.page.id, tree)}
                  status={status}
                  counter={counter}
                  countText={mind.countText}
                  label={mind.labelOf(n, status, counter)}
                  activity={mind.activityOf(n.page)}
                  progress={progress}
                  selected={selectedId === n.page.id}
                  dimmed={highlights.dimmed(n.page.id)}
                  mark={highlights.markOf(n.page.id)}
                  item={keys.itemOf(n.page.id, n.depth + 1, n.branches > 0)}
                  onSelect={onSelect}
                  onPoint={highlights.point}
                  onLeave={highlights.leave}
                  onIntent={onIntent}
                />
              );
              // The + right after its page, so the CSS can show it while the page is pointed at or focused
              const p = plus(n.page.id, displayTitle(n.page), n.side === 1 ? n.inner.x + n.w : n.inner.x - n.w, n.inner.y);
              return p ? [node, p] : node;
            })}
          </div>
        )}
        {branch && promptAt && (
          <div className={classes.branchPrompt} style={promptAt} data-animate={viewport.state.animate || undefined}>
            {branch.prompt}
          </div>
        )}
      </div>
      <MapTools
        zoom={view?.k ?? 1}
        rootTitle={displayTitle(tree.root.page)}
        progress={progress}
        onZoomOut={viewport.operations.zoomOut}
        onZoomIn={viewport.operations.zoomIn}
        onFit={viewport.operations.fitAll}
        onCentre={viewport.operations.centreOnRoot}
      />
    </div>
  );
}
