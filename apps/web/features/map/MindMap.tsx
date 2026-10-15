'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ActionIcon, Divider, Group, HoverCard, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconCircle,
  IconCircleCheckFilled,
  IconBook2,
  IconCircleDotFilled,
  IconFocusCentered,
  IconInfoCircle,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import type { Page, PageColor, Project } from '@wisepath/domain/projects';
import { descendants, lookOf, mapTree, progressOf } from '@wisepath/domain/projects';
import { displayTitle } from '@/features/shared/title';
import { PageGlyph, shade } from '@/features/shared/look';
import { RELATED_HOVER_EVENT, relatedFromEvent } from '@/features/shared/relatedHover';
import { useWindowEvent } from '@mantine/hooks';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import { layoutMind, rootShape } from './mindLayout';
import type { PlacedNode, Point, RootShape } from './mindLayout';
import classes from './MindMap.module.css';

/**
 * MindMap
 * The project read from its [[links]]: root in the middle, branches level by
 * level outward, modules drawn larger, other links as blue arrows. Pages no
 * link reaches are not drawn (the header lists them, see MapOrphans). Drag or
 * scroll to pan, pinch or Ctrl/⌘ + scroll to zoom. Every page is a button.
 */

/** Opening a page zooms out at most to this, to show the pages branching from it */
const MIN_FRAME_ZOOM = 0.5;

export interface FocusRequest {
  pageId: string;
  nonce: number;
}

interface MindMapProps {
  project: Project;
  selectedId: string | null;
  /** The page "Continue studying" leads to */
  currentId: string | null;
  /** A learning path shows what was studied; a study shows its pages plainly, with counts */
  progress: boolean;
  /** Pages matching the search; null when not searching */
  matchIds: Set<string> | null;
  /** The search result marked in its list (by the pointer or the arrow keys) */
  searchActiveId?: string | null;
  focusRequest: FocusRequest | null;
  /** Width covered on the right (by the page drawer); focusing centres pages in what is left */
  coveredRight?: number;
  onSelect: (pageId: string) => void;
  /** The pointer or focus rests on a page: a good moment to load it ahead of the click */
  onIntent?: (pageId: string) => void;
  /** Shown in the map's top-left corner (the search) */
  topLeft?: ReactNode;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.2;
/** The least zoom at which a page's 13px title still reads at 11px on screen: the map opens no smaller */
const READABLE_ZOOM = 0.85;
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

export function MindMap({
  project,
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
}: MindMapProps) {
  const t = useT();
  const tree = useMemo(() => mapTree(project), [project]);
  const root = useMemo(() => rootShape(displayTitle(tree.root.page)), [tree]);
  const layout = useMemo(() => layoutMind(tree, root), [tree, root]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  /** The whole map in view; `floor` keeps text readable on the first view, at the cost of some panning */
  const fit = useCallback(
    (w: number, h: number, floor = 0): View => {
      const { minX, minY, maxX, maxY } = layout.bounds;
      const pad = 48;
      const whole = Math.min((w - pad) / (maxX - minX), (h - pad) / (maxY - minY), 1);
      // On a phone the whole map would be unreadable: start readable, around the root
      if (w < 640 && whole < READABLE_ZOOM) return { k: READABLE_ZOOM, x: w / 2, y: h / 2 };
      const k = clampZoom(Math.max(whole, Math.min(floor, 1)));
      return { k, x: w / 2 - k * ((minX + maxX) / 2), y: h / 2 - k * ((minY + maxY) / 2) };
    },
    [layout.bounds],
  );

  // Track the viewport size; fit the map the first time it is known. Measure
  // once right away too: a tab that is not painting yet delays the observer.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = (w: number, h: number) => {
      if (!w || !h) return;
      setSize({ w, h });
      setView((v) => v ?? fit(w, h, READABLE_ZOOM));
    };
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const smoothly = (next: (v: View) => View) => {
    setAnimate(true);
    setView((v) => (v ? next(v) : v));
  };

  const zoomBy = (factor: number, around?: Point) =>
    setView((v) => {
      if (!v || !size) return v;
      const p = around ?? { x: size.w / 2, y: size.h / 2 };
      const k = clampZoom(v.k * factor);
      return { k, x: p.x - ((p.x - v.x) * k) / v.k, y: p.y - ((p.y - v.y) * k) / v.k };
    });

  const recentre = () => size && smoothly(() => fit(size.w, size.h));
  /** Keeps the zoom and brings the root to the middle */
  const centreOnRoot = () => size && smoothly((v) => ({ ...v, x: size.w / 2, y: size.h / 2 }));

  // Bring a page into view, with its branches: asked from outside the map (search, related pages), or moved to by keyboard
  const frameOn = (pageId: string) => {
    if (!size) return;
    const c = layout.centres.get(pageId as Page['id']);
    if (!c) return;
    // The part of the viewport the drawer leaves visible
    const frameRight = viewportRef.current?.getBoundingClientRect().right ?? 0;
    const covered = Math.max(0, Math.min(coveredRight - (window.innerWidth - frameRight), size.w - 200));
    const visibleW = size.w - covered;
    // The page and the pages branching from it, so opening a page shows where it leads
    const branch = [c, ...(tree.nodes.get(pageId as Page['id'])?.children ?? [])
      .map((child) => layout.centres.get(child.page.id))
      .filter((p): p is NonNullable<typeof p> => !!p)];
    const box = {
      minX: Math.min(...branch.map((p) => p.x)) - 90,
      maxX: Math.max(...branch.map((p) => p.x)) + 90,
      minY: Math.min(...branch.map((p) => p.y)) - 30,
      maxY: Math.max(...branch.map((p) => p.y)) + 30,
    };
    smoothly((v) => {
      const margin = 40;
      const inView = (x: number, y: number) => x > margin && x < visibleW - margin && y > margin && y < size.h - margin;
      if (inView(v.x + box.minX * v.k, v.y + box.minY * v.k) && inView(v.x + box.maxX * v.k, v.y + box.maxY * v.k)) return v;
      // The whole branch beside the drawer, zooming out for it down to half size; past that, the page itself
      const fitK = Math.min((visibleW - 2 * margin) / (box.maxX - box.minX), (size.h - 2 * margin) / (box.maxY - box.minY));
      const k = Math.min(v.k, Math.max(fitK, MIN_FRAME_ZOOM));
      const fits = fitK >= MIN_FRAME_ZOOM;
      const cx = fits ? (box.minX + box.maxX) / 2 : c.x;
      const cy = fits ? (box.minY + box.maxY) / 2 : c.y;
      return { k, x: visibleW / 2 - cx * k, y: size.h / 2 - cy * k };
    });
  };
  useEffect(() => {
    if (focusRequest) frameOn(focusRequest.pageId);
    // Runs again once the size is known, so a page opened from the URL is brought into view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce, size !== null]);

  // Wheel pans; Ctrl/⌘ + wheel (and trackpad pinch) zooms around the pointer
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setAnimate(false);
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomBy(Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
      } else {
        setView((v) => (v ? { ...v, x: v.x - event.deltaX, y: v.y - event.deltaY } : v));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setAnimate(false);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    d.x = event.clientX;
    d.y = event.clientY;
    d.moved = true;
    setView((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const dimmed = (id: string) => matchIds !== null && !matchIds.has(id);
  // The result marked in the search's list (else the page opened from it) stands out from the others it found,
  // which step back a little
  const picked =
    matchIds === null ? null : searchActiveId ?? (selectedId !== null && matchIds.has(selectedId) ? selectedId : null);
  // A page pointed at in the drawer's Related list: its connection to the open page is singled out
  const [relatedId, setRelatedId] = useState<string | null>(null);
  useWindowEvent(RELATED_HOVER_EVENT, (event) => setRelatedId(relatedFromEvent(event)));
  useEffect(() => setRelatedId(null), [selectedId]);
  const pointed = relatedId !== null && selectedId !== null ? relatedId : null;
  const searchMark = (id: string) => ({
    'data-picked': picked === id || undefined,
    'data-receded': (picked !== null && picked !== id && !dimmed(id)) || undefined,
    'data-related': pointed === id || undefined,
  });
  const touchesSelection = (from: string, to: string) => selectedId !== null && (from === selectedId || to === selectedId);
  /** The line between the open page and the related one pointed at, either way */
  const isPointedLink = (from: string, to: string) =>
    pointed !== null && ((from === selectedId && to === pointed) || (from === pointed && to === selectedId));
  // Links across the map stay faint until they matter: from or to the open page, or the one under the pointer.
  // While a related page is pointed at, only its link does
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const arrowActive = (from: string, to: string) =>
    pointed !== null
      ? isPointedLink(from, to)
      : touchesSelection(from, to) || (hoveredId !== null && (from === hoveredId || to === hoveredId));
  const intent = (pageId: string) => {
    setHoveredId(pageId);
    onIntent?.(pageId);
  };
  const { minX, minY, maxX, maxY } = layout.bounds;
  const pad = 40;
  const rootId = tree.root.page.id;

  // The map is one stop for Tab, like a tree: the arrow keys move between its pages. → and ← go along the
  // branches as they are drawn (outward to the nearest page branching off, inward to the one it grows from),
  // ↑ and ↓ to the page above or below on the same branch, Home to the centre. Enter opens the page.
  const placed = useMemo(() => new Map(layout.nodes.map((n) => [n.page.id as string, n])), [layout.nodes]);
  const [rovingId, setRovingId] = useState<string | null>(null);
  const tabStop = [rovingId, selectedId, currentId].find((id) => id && (id === rootId || placed.has(id))) ?? rootId;
  const nearest = (ids: ReadonlyArray<string>, y: number) =>
    ids.reduce<string | null>((best, id) => {
      if (best === null) return id;
      return Math.abs(placed.get(id)!.inner.y - y) < Math.abs(placed.get(best)!.inner.y - y) ? id : best;
    }, null);
  const neighbour = (id: string, key: string): string | null => {
    if (key === 'Home') return rootId;
    if (id === rootId) {
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
      const side = key === 'ArrowRight' ? 1 : -1;
      return nearest(layout.nodes.filter((n) => n.depth === 1 && n.side === side).map((n) => n.page.id), 0);
    }
    const n = placed.get(id);
    const node = tree.nodes.get(id as Page['id']);
    if (!n || !node) return null;
    const outward = n.side === 1 ? 'ArrowRight' : 'ArrowLeft';
    const inward = n.side === 1 ? 'ArrowLeft' : 'ArrowRight';
    if (key === outward) return nearest(node.children.map((c) => c.page.id), n.inner.y);
    if (key === inward) return node.parentId;
    if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
    const column = layout.nodes
      .filter((m) => tree.nodes.get(m.page.id)?.parentId === node.parentId && m.side === n.side)
      .sort((a, b) => a.inner.y - b.inner.y);
    const at = column.findIndex((m) => m.page.id === id);
    return column[at + (key === 'ArrowDown' ? 1 : -1)]?.page.id ?? null;
  };
  const onTreeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const from = (event.target as HTMLElement).closest<HTMLElement>('[data-page-id]')?.dataset.pageId;
    if (!from || !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const to = neighbour(from, event.key);
    if (!to) return;
    setRovingId(to);
    document.querySelector<HTMLElement>(`[data-page-id="${to}"]`)?.focus({ preventScroll: true });
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
      setRovingId(was);
      document.querySelector<HTMLElement>(`[data-page-id="${was}"]`)?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedId]);
  const treeItem = (id: string, level: number, expanded: boolean) => ({
    role: 'treeitem',
    'aria-level': level,
    'aria-selected': selectedId === id,
    'aria-expanded': expanded || undefined,
    tabIndex: id === tabStop ? 0 : -1,
    onFocusCapture: () => setRovingId(id),
  });
  const rootLook = lookOf(project, rootId, tree);
  const overall = progressOf(descendants(tree.root));
  const statusOf = (page: Page): TopicStatus => (page.studied ? 'done' : page.id === currentId ? 'current' : 'todo');
  /** What a branch holds: studied of all in a learning path, how many pages in a study */
  const countText = (c: { studied: number; total: number }) => (progress ? `${c.studied}/${c.total}` : t('map.pages', { count: c.total }));
  const counterOf = (id: Page['id']) => {
    const node = tree.nodes.get(id);
    return node ? progressOf(descendants(node)) : { studied: 0, total: 0 };
  };

  return (
    <div className={classes.frame}>
      {/* Top left: what the page puts here (the search); first in the tab order, before the map's pages */}
      <div className={classes.topLeft}>{topLeft}</div>
      <div
        ref={viewportRef}
        className={classes.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-dragging={drag.current ? true : undefined}
      >
        {view && (
          <div
            className={classes.stage}
            role="tree"
            aria-label={t('map.mind.label', { title: displayTitle(tree.root.page) })}
            onKeyDown={onTreeKeyDown}
            data-animate={animate || undefined}
            onTransitionEnd={() => setAnimate(false)}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          >
            <svg
              className={classes.lines}
              style={{ left: minX - pad, top: minY - pad }}
              width={maxX - minX + pad * 2}
              height={maxY - minY + pad * 2}
              viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
              aria-hidden="true"
            >
              <defs>
                <marker id="wp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--mantine-color-blue-6)" />
                </marker>
              </defs>
              {layout.branches.map((line) => (
                <path
                  key={line.key}
                  d={line.d}
                  fill="none"
                  stroke={shade(lookOf(project, line.to, tree).color, isPointedLink(line.from, line.to) ? 6 : line.from === rootId ? 4 : 3)}
                  strokeWidth={isPointedLink(line.from, line.to) ? 3.4 : line.from === rootId ? 2.4 : 1.6}
                  opacity={dimmed(line.to) ? 0.25 : 0.9}
                />
              ))}
              {layout.arrows.map((line) => (
                <path
                  key={line.key}
                  d={line.d}
                  fill="none"
                  stroke="var(--mantine-color-blue-6)"
                  strokeWidth={isPointedLink(line.from, line.to) ? 3.2 : arrowActive(line.from, line.to) ? 2.6 : 1.4}
                  strokeLinecap="round"
                  markerEnd="url(#wp-arrow)"
                  opacity={arrowActive(line.from, line.to) ? 0.95 : 0.16}
                />
              ))}
            </svg>

            <RootNode
              shape={root}
              page={tree.root.page}
              color={rootLook.color}
              icon={<PageGlyph icon={rootLook.icon} size={24} />}
              studied={overall.studied}
              total={overall.total}
              progress={progress}
              selected={selectedId === rootId}
              dimmed={dimmed(rootId)}
              mark={searchMark(rootId)}
              item={treeItem(rootId, 1, tree.root.children.length > 0)}
              onSelect={onSelect}
              onIntent={onIntent}
            />

            {layout.nodes.map((n) => {
              const look = lookOf(project, n.page.id, tree);
              const status = statusOf(n.page);
              const counter = n.branches > 0 ? counterOf(n.page.id) : null;
              const label = [
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
              return n.module ? (
                <UnstyledButton
                  key={n.page.id}
                  className={classes.module}
                  style={place(n, look.color)}
                  data-status={progress ? status : undefined}
                  data-page-id={n.page.id}
                  data-selected={selectedId === n.page.id || undefined}
                  data-dimmed={dimmed(n.page.id) || undefined}
                  {...searchMark(n.page.id)}
                  {...treeItem(n.page.id, n.depth + 1, n.branches > 0)}
                  onClick={() => onSelect(n.page.id)}
                  onPointerEnter={() => intent(n.page.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onFocus={() => onIntent?.(n.page.id)}
                  aria-label={label}
                  title={displayTitle(n.page)}
                >
                  <ThemeIcon size={40} radius="xl" variant="light" color={look.color} className={classes.moduleIcon}>
                    <PageGlyph icon={look.icon} size={21} />
                  </ThemeIcon>
                  <span className={classes.moduleText}>
                    <span className={classes.moduleTitle}>{displayTitle(n.page)}</span>
                    {(counter || progress) && <span className={classes.count}>{counter ? countText(counter) : t(STATUS_KEY[status])}</span>}
                  </span>
                  {progress && n.page.studied && <IconCircleCheckFilled size={18} color="var(--mantine-color-teal-6)" className={classes.moduleCheck} aria-hidden="true" />}
                </UnstyledButton>
              ) : (
                <UnstyledButton
                  key={n.page.id}
                  className={classes.topic}
                  style={place(n, look.color)}
                  data-status={progress ? status : undefined}
                  data-page-id={n.page.id}
                  data-selected={selectedId === n.page.id || undefined}
                  data-dimmed={dimmed(n.page.id) || undefined}
                  {...searchMark(n.page.id)}
                  {...treeItem(n.page.id, n.depth + 1, n.branches > 0)}
                  onClick={() => onSelect(n.page.id)}
                  onPointerEnter={() => intent(n.page.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onFocus={() => onIntent?.(n.page.id)}
                  aria-label={label}
                  title={displayTitle(n.page)}
                >
                  {progress ? <StatusIcon status={status} /> : <PageIcon />}
                  <span className={classes.topicTitle}>{displayTitle(n.page)}</span>
                  {counter && <span className={classes.chip}>{progress ? `${counter.studied}/${counter.total}` : counter.total}</span>}
                </UnstyledButton>
              );
            })}
          </div>
        )}
      </div>


      {/* Tools for viewing the graph, together at the bottom left: the drawer covers the right */}
      <Group gap={0} className={classes.tools} wrap="nowrap" role="toolbar" aria-label={t('map.tools.label')}>
        <Tooltip label={t('map.tools.zoomOut')}>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => zoomBy(1 / 1.2)} aria-label={t('map.tools.zoomOut')}>
            <IconMinus size={17} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('map.tools.fit')}>
          <UnstyledButton className={classes.zoomValue} onClick={recentre} aria-label={t('map.tools.fit')}>
            {view ? Math.round(view.k * 100) : 100}%
          </UnstyledButton>
        </Tooltip>
        <Tooltip label={t('map.tools.zoomIn')}>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => zoomBy(1.2)} aria-label={t('map.tools.zoomIn')}>
            <IconPlus size={17} />
          </ActionIcon>
        </Tooltip>
        <Divider orientation="vertical" className={classes.toolsDivider} />
        <Tooltip label={t('map.tools.centreOn', { title: displayTitle(tree.root.page) })}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={centreOnRoot}
            aria-label={t('map.tools.centreOn', { title: displayTitle(tree.root.page) })}
          >
            <IconFocusCentered size={17} />
          </ActionIcon>
        </Tooltip>
        <Divider orientation="vertical" className={classes.toolsDivider} />
        <HoverCard position="top-start" shadow="md" openDelay={80}>
          <HoverCard.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label={t('map.tools.legend')}>
              <IconInfoCircle size={17} />
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap={8} aria-label={t('map.tools.legend')}>
              {(progress ? (['done', 'current', 'todo'] as const) : []).map((s) => (
                <Group key={s} gap={8} wrap="nowrap">
                  <StatusIcon status={s} />
                  <Text size="sm">{t(STATUS_KEY[s])}</Text>
                </Group>
              ))}
              <Group gap={8} wrap="nowrap">
                <svg width="26" height="10" aria-hidden="true">
                  <path d="M1,5 L19,5" stroke="var(--mantine-color-blue-6)" strokeWidth="2.2" />
                  <path d="M17,1 L25,5 L17,9 z" fill="var(--mantine-color-blue-6)" />
                </svg>
                <Text size="sm">{t('map.legend.crossLink')}</Text>
              </Group>
              <Text size="xs" c="dimmed" maw={260}>
                {t('map.legend.keys')}
              </Text>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      </Group>
    </div>
  );
}

export type TopicStatus = 'done' | 'current' | 'todo';

/** The message naming each status */
export const STATUS_KEY: Record<TopicStatus, TranslationKey> = {
  done: 'map.status.done',
  current: 'map.status.current',
  todo: 'map.status.todo',
};

/** A page in a study, which has no status to show: the page itself */
export function PageIcon({ size = 18 }: { size?: number }) {
  return <IconBook2 size={size} stroke={1.7} color="var(--mantine-color-dimmed)" aria-hidden="true" />;
}

export function StatusIcon({ status, size = 18 }: { status: TopicStatus; size?: number }) {
  if (status === 'done') return <IconCircleCheckFilled size={size} color="var(--mantine-color-teal-6)" aria-hidden="true" />;
  if (status === 'current') return <IconCircleDotFilled size={size} color="var(--mantine-color-blue-6)" aria-hidden="true" />;
  return <IconCircle size={size} stroke={1.8} color="var(--mantine-color-gray-5)" aria-hidden="true" />;
}

const tints = (color: PageColor) => ({
  '--c0': shade(color, 0),
  '--c1': shade(color, 1),
  '--c2': shade(color, 2),
  '--c3': shade(color, 3),
  '--c6': shade(color, 6),
});

/** Absolute position of a node: it grows away from the root, from its inner end */
function place(n: PlacedNode, color: PageColor): CSSProperties {
  return {
    left: n.side === 1 ? n.inner.x : n.inner.x - n.w,
    top: n.inner.y - n.h / 2,
    width: n.w,
    height: n.h,
    '--lines': n.lines,
    ...tints(color),
  } as CSSProperties;
}

function placeBox(shape: RootShape, color: PageColor): CSSProperties {
  return { left: -shape.w / 2, top: -shape.h / 2, width: shape.w, height: shape.h, ...tints(color) } as CSSProperties;
}

interface RootNodeProps {
  shape: RootShape;
  page: Page;
  color: PageColor;
  icon: React.ReactNode;
  studied: number;
  total: number;
  /** Show the ring and the studied count: a learning path */
  progress: boolean;
  selected: boolean;
  dimmed: boolean;
  /** How it stands among what the search found */
  mark: Record<string, true | undefined>;
  /** Its place in the map as a tree, for the keyboard and screen readers */
  item: Record<string, unknown>;
  onSelect: (pageId: string) => void;
  onIntent?: (pageId: string) => void;
}

/** The map's progress as a ring, the root's colour inside */
function ProgressRing({ size, stroke, share }: { size: number; stroke: number; share: number }) {
  const r = size / 2 - stroke / 2 - 1.5;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className={classes.ring} width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="wp-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--mantine-color-teal-5)" />
          <stop offset="100%" stopColor="var(--mantine-color-cyan-5)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mantine-color-gray-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#wp-ring)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * share} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/**
 * The root: a card with the map's progress as a ring around its icon (in a learning path), and the title beside
 * it, as long as it needs
 */
function RootNode({ shape, page, color, icon, studied, total, progress, selected, dimmed, mark, item, onSelect, onIntent }: RootNodeProps) {
  const t = useT();
  const title = displayTitle(page);
  return (
    <UnstyledButton
      className={classes.root}
      style={{ ...placeBox(shape, color), '--lines': shape.lines } as CSSProperties}
      data-page-id={page.id}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      {...mark}
      {...item}
      onClick={() => onSelect(page.id)}
      onPointerEnter={() => onIntent?.(page.id)}
      onFocus={() => onIntent?.(page.id)}
      aria-label={
        progress ? t('map.mind.rootLabelStudied', { title, studied, count: total }) : t('map.mind.rootLabel', { title, count: total })
      }
      title={displayTitle(page)}
    >
      <span className={classes.rootRing}>
        {progress && <ProgressRing size={64} stroke={5} share={total ? studied / total : 0} />}
        <ThemeIcon size={44} radius="xl" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </span>
      <span className={classes.rootText}>
        <span className={classes.rootTitle}>{displayTitle(page)}</span>
        <span className={classes.count}>
          {progress ? t('map.mind.rootStudied', { studied, count: total }) : t('map.pages', { count: total })}
        </span>
      </span>
    </UnstyledButton>
  );
}
