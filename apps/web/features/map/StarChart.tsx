'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Page, Project } from '@wisepath/domain/projects';
import type { ChartPosition } from './graphLayout';
import { displayTitle, pagesInOrder, wordCount } from '@wisepath/domain/projects';
import { references, subjectOf } from '@wisepath/domain/projects';
import { graphKey, layoutGraph } from './graphLayout';
import type { GraphLayout } from './graphLayout';
import { ActionIcon, Box, Button, Group, Paper, Stack, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { IconGrid4x4, IconMaximize, IconMinus, IconPlus } from '@tabler/icons-react';
import classes from './StarChart.module.css';

/**
 * StarChart
 * The project as a star chart that flows downward, Obsidian-style: the start
 * page sits at the top and the pages it links with [[Title]] settle below it,
 * clustered by their links, down to the destination, a crown of stars that
 * lights up as pages are studied. Hovering a star dims everything it does not
 * link. Pages the start never reaches float apart on the right.
 * Click a star to open it. The + under the open star adds a page one level
 * below: type its name and press Enter (Enter again adds a sibling, Tab goes
 * one level deeper). Each new page is a [[link]] written into the page above.
 * Positions are projected to screen space so star sizes and labels stay
 * constant while zoom spreads the chart.
 */

interface Camera {
  cx: number;
  cy: number;
  k: number;
}

export interface FocusRequest {
  pageId: string;
  nonce: number;
  /** 'center' glides the star to the middle; 'reveal' moves only if it is out of view */
  mode?: 'center' | 'reveal';
}

interface StarChartProps {
  project: Project;
  selectedId: string | null;
  /** Page ids matching the current search, or null when not searching */
  matchIds: Set<string> | null;
  focusRequest: FocusRequest | null;
  onSelect: (pageId: string | null) => void;
  /** Adds a page below `parentId` (null: the start page) and returns its id */
  onAddChild: (parentId: string | null, title: string) => string;
  /** Opens the name field under a page (null: under nothing, for the start page) */
  composeRequest: { parentId: string | null; nonce: number } | null;
  /** Kept up to date with the chart point at the middle of the view */
  viewCenterRef?: { current: ChartPosition | null };
  /** Restores the sample project as shipped; shown only for the sample */
  onResetSample?: () => void;
}

type Gesture = { kind: 'pan'; x: number; y: number; cx: number; cy: number; moved: boolean };

/** Spacing of the optional background grid, in chart units */
const GRID = 150;
/** How long stars take to glide to new places when links change */
const RELAYOUT_MS = 520;
const MIN_K = 0.3;
const MAX_K = 2.5;
const LABEL_ALL_K = 0.6;
/** Below this zoom only selected, searched, linked and studied pages keep labels */
const LABEL_STUDIED_K = 0.45;
/** When fitting everything would zoom out past this, open closer in */
const MIN_FIT_K = 0.5;
const FINDER_RINGS = [20, 34, 50];
const DESTINATION_HEIGHT = 250;
/** Space between the deepest page and the destination crown */
const DESTINATION_GAP = 90;
/** Screen height of the legend strip, kept clear when fitting */
const LEGEND_H = 44;

const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
/** Star size follows how much is written on the page */
const starRadius = (page: Page, k: number) =>
  (4 + Math.min(wordCount(page.content) / 50, 6) * 1.8) * Math.min(1, Math.max(0.65, k));

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StarChart({
  project,
  selectedId,
  matchIds,
  focusRequest,
  onSelect,
  onAddChild,
  composeRequest,
  viewCenterRef,
  onResetSample,
}: StarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCamState] = useState<Camera | null>(null);
  const camRef = useRef<Camera | null>(null);
  const frameRef = useRef<number>(0);
  const gestureRef = useRef<Gesture | null>(null);
  const [gestureKind, setGestureKind] = useState<Gesture['kind'] | null>(null);
  /** The name field for a new page: open under `parentId` (null: first page) */
  const [composer, setComposer] = useState<{ parentId: string | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const setCam = useCallback(
    (next: Camera) => {
      camRef.current = next;
      if (viewCenterRef) viewCenterRef.current = { x: next.cx, y: next.cy };
      setCamState(next);
    },
    [viewCenterRef],
  );

  const pages = useMemo(() => pagesInOrder(project), [project]);
  const refs = useMemo(() => references(project), [project]);

  // Layout only changes when pages or links change, not while typing; stars glide to new places
  const key = useMemo(() => graphKey(project), [project]);
  const [layout, setLayout] = useState<GraphLayout>(() => layoutGraph(project));
  const [shown, setShown] = useState<Map<string, ChartPosition>>(layout.positions);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const firstKey = useRef(key);
  useEffect(() => {
    if (key === firstKey.current) return;
    firstKey.current = key;
    const next = layoutGraph(project, shownRef.current);
    setLayout(next);
    const from = shownRef.current;
    if (prefersReducedMotion()) {
      setShown(next.positions);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / RELAYOUT_MS);
      const e = 1 - Math.pow(1 - t, 3);
      const mid = new Map<string, ChartPosition>();
      next.positions.forEach((to, id) => {
        const a = from.get(id) ?? to;
        mid.set(id, { x: a.x + (to.x - a.x) * e, y: a.y + (to.y - a.y) * e });
      });
      setShown(mid);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // The key captures every change that matters to the layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const positionOf = useCallback(
    (pageId: string) => shown.get(pageId) ?? layout.positions.get(pageId) ?? { x: 0, y: 0 },
    [shown, layout],
  );

  const hasStart = !!project.startPageId && layout.positions.has(project.startPageId);
  const studiedCount = project.pages.filter((p) => p.studied).length;

  /** Chart bounds: the descent, the column set apart and the destination */
  const bounds = useMemo(() => {
    const all = Array.from(layout.positions.values());
    if (!all.length) return { minX: -300, maxX: 300, minY: -130, maxY: 300 };
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const bottom = hasStart ? layout.bottomY + DESTINATION_GAP + DESTINATION_HEIGHT : Math.max(...ys) + 100;
    return { minX: Math.min(...xs, -260) - 100, maxX: Math.max(...xs, 260) + 100, minY: Math.min(...ys) - 110, maxY: bottom };
  }, [layout, hasStart]);

  const fitCamera = useCallback(
    (w: number, h: number): Camera => {
      const usable = Math.max(h - LEGEND_H, 100);
      const k = clampK(Math.min(w / (bounds.maxX - bounds.minX), usable / (bounds.maxY - bounds.minY), 1.2));
      // Centre the chart in the area above the legend
      return { cx: (bounds.minX + bounds.maxX) / 2, cy: (bounds.minY + bounds.maxY) / 2 + LEGEND_H / 2 / k, k };
    },
    [bounds],
  );

  // Too tall to fit legibly: open at the top of the descent instead
  const openingCamera = useCallback(
    (w: number, h: number): Camera => {
      const fitted = fitCamera(w, h);
      if (fitted.k >= MIN_FIT_K) return fitted;
      const k = LABEL_ALL_K;
      return { cx: fitted.cx, cy: bounds.minY + h / 2 / k, k };
    },
    [fitCamera, bounds.minY],
  );

  const animateTo = useCallback(
    (target: Camera, duration: number) => {
      cancelAnimationFrame(frameRef.current);
      const from = camRef.current;
      if (!from || prefersReducedMotion()) {
        setCam(target);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setCam({
          cx: from.cx + (target.cx - from.cx) * e,
          cy: from.cy + (target.cy - from.cy) * e,
          k: from.k * Math.pow(target.k / from.k, e),
        });
        if (t < 1) frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [setCam],
  );

  // Track the chart's size; fit once, then keep the camera when the page sheet resizes the chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ w, h });
      if (!camRef.current) setCam(openingCamera(w, h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [openingCamera, setCam]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const sizeRef = useRef(size);
  sizeRef.current = size;

  const focusOn = useCallback(
    (pageId: string, mode: 'center' | 'reveal' = 'center') => {
      const current = camRef.current;
      if (!layout.positions.has(pageId) || !current) return;
      const p = positionOf(pageId);
      if (mode === 'reveal') {
        const { w, h } = sizeRef.current;
        const sx = (p.x - current.cx) * current.k + w / 2;
        const sy = (p.y - current.cy) * current.k + h / 2;
        const margin = 70;
        if (sx > margin && sx < w - margin && sy > margin && sy < h - margin) return;
        animateTo({ ...current, cx: p.x, cy: p.y }, 420);
        return;
      }
      animateTo({ cx: p.x, cy: p.y, k: clampK(Math.max(current.k, 1)) }, 480);
    },
    [animateTo, layout, positionOf],
  );

  useEffect(() => {
    if (!focusRequest) return;
    // Wait a frame so a sheet that just opened has resized the chart
    const id = requestAnimationFrame(() => focusOn(focusRequest.pageId, focusRequest.mode));
    return () => cancelAnimationFrame(id);
  }, [focusRequest, focusOn]);

  const zoomBy = (factor: number) => {
    const current = camRef.current;
    if (!current) return;
    animateTo({ ...current, k: clampK(current.k * factor) }, 220);
  };

  const fit = () => animateTo(fitCamera(size.w, size.h), 320);

  useEffect(() => {
    if (!composeRequest) return;
    setDraft('');
    setComposer({ parentId: composeRequest.parentId });
  }, [composeRequest]);

  // Close the name field when its page is no longer the open one
  useEffect(() => {
    setComposer((c) => (c && c.parentId !== null && c.parentId !== selectedId ? null : c));
  }, [selectedId]);

  const closeComposer = () => {
    setComposer(null);
    setDraft('');
  };

  /** Enter adds a sibling (the field stays under the same page); Tab adds it and goes one level deeper */
  const submitDraft = (descend: boolean) => {
    const title = draft.trim();
    if (!composer || !title) return;
    const id = onAddChild(composer.parentId, title);
    setDraft('');
    if (descend || composer.parentId === null) {
      setComposer({ parentId: id });
      onSelect(id);
    }
  };

  // Wheel zooms around the pointer; needs a non-passive listener to stop page scroll
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      const current = camRef.current;
      if (!current) return;
      event.preventDefault();
      cancelAnimationFrame(frameRef.current);
      const rect = svg.getBoundingClientRect();
      const mx = event.clientX - rect.left - rect.width / 2;
      const my = event.clientY - rect.top - rect.height / 2;
      const k = clampK(current.k * Math.exp(-event.deltaY * 0.0015));
      const wx = current.cx + mx / current.k;
      const wy = current.cy + my / current.k;
      setCam({ cx: wx - mx / k, cy: wy - my / k, k });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [setCam]);

  const startGesture = (gesture: Gesture, event: ReactPointerEvent) => {
    cancelAnimationFrame(frameRef.current);
    gestureRef.current = gesture;
    setGestureKind(gesture.kind);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = camRef.current;
    if (event.button !== 0 || (event.target as Element).closest('[data-star]') || !current) return;
    startGesture({ kind: 'pan', x: event.clientX, y: event.clientY, cx: current.cx, cy: current.cy, moved: false }, event);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    const current = camRef.current;
    if (!gesture || !current) return;

    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    setCam({ cx: gesture.cx - dx / current.k, cy: gesture.cy - dy / current.k, k: current.k });
  };

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    setGestureKind(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);

    if (!gesture.moved && !cancelled) onSelect(null);
  };

  const onStarKeyDown = (event: KeyboardEvent<SVGGElement>, pageId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(pageId);
    }
  };

  // Hovering a star focuses its links (like Obsidian); otherwise the open page does
  const focusId = hoveredId ?? selectedId;
  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of refs) {
      if (r.from === focusId) ids.add(r.to);
      if (r.to === focusId) ids.add(r.from);
    }
    return ids;
  }, [refs, focusId]);
  const inHoverFocus = (id: string) => !hoveredId || id === hoveredId || neighborIds.has(id);

  const view = cam && size.w > 0 ? cam : null;
  const toScreen = (p: ChartPosition): [number, number] =>
    view ? [(p.x - view.cx) * view.k + size.w / 2, (p.y - view.cy) * view.k + size.h / 2] : [0, 0];

  const verticals = useMemo(() => {
    if (!view) return [] as number[];
    const halfW = size.w / 2 / view.k;
    const out: number[] = [];
    for (let v = Math.ceil((view.cx - halfW) / GRID) * GRID; v <= view.cx + halfW; v += GRID) {
      out.push(v);
    }
    return out;
  }, [view, size.w]);

  const selectedPos = selectedId && layout.positions.has(selectedId) ? toScreen(positionOf(selectedId)) : null;
  const searchEmpty = matchIds !== null && matchIds.size === 0;
  const cursor = gestureKind === 'pan' ? 'cursor-grabbing' : 'cursor-grab';
  // Label for the pages set apart, above their loose cluster
  const apartLabel = useMemo(() => {
    const pts = layout.apart.map((id) => layout.positions.get(id)).filter((p): p is ChartPosition => !!p);
    if (!pts.length) return null;
    return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: Math.min(...pts.map((p) => p.y)) - 50 };
  }, [layout]);

  return (
    <div ref={containerRef} className={classes.chart}>
      <svg
        ref={svgRef}
        className={classes.svg}
        data-panning={gestureKind === 'pan' || undefined}
        role="group"
        aria-label={`Chart of ${project.title}, read from the start page down. Drag to move, scroll to zoom.`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e)}
        onPointerCancel={(e) => endGesture(e, true)}
      >
        {view && showGrid && (
          <g aria-hidden="true">
            {verticals.map((x) => {
              const [sx] = toScreen({ x, y: 0 });
              return (
                <line key={`v${x}`} x1={sx} x2={sx} y1={0} y2={size.h} stroke="var(--grid)" strokeWidth={1} opacity={0.6} />
              );
            })}
          </g>
        )}

        {view && apartLabel && (
          <text
            aria-hidden="true"
            x={toScreen(apartLabel)[0]}
            y={toScreen(apartLabel)[1]}
            textAnchor="middle"
            fill="var(--star-dim)"
            fontSize={12}
          >
            {hasStart ? 'Not linked from the start yet' : 'Pages'}
          </text>
        )}

        {view && hasStart && (
          <Destination
            seed={project.id}
            studied={studiedCount}
            total={project.pages.length}
            subject={subjectOf(project)}
            origin={toScreen({ x: 0, y: layout.bottomY + DESTINATION_GAP })}
            k={view.k}
            width={size.w}
          />
        )}

        {view && (
          <g aria-hidden="true">
            {refs.map((r) => {
              const [x1, y1] = toScreen(positionOf(r.from));
              const [x2, y2] = toScreen(positionOf(r.to));
              const raised = r.from === focusId || r.to === focusId;
              const dimmed =
                (matchIds !== null && !(matchIds.has(r.from) && matchIds.has(r.to))) || (!!hoveredId && !raised);
              return (
                <line
                  key={`r-${r.from}-${r.to}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={raised ? 'var(--star-ring)' : 'var(--star-dim)'}
                  strokeWidth={raised ? 1.8 : 1.2}
                  opacity={dimmed ? 0.15 : raised ? 1 : 0.7}
                />
              );
            })}
          </g>
        )}

        {view &&
          pages.map((page) => {
            const [x, y] = toScreen(positionOf(page.id));
            const r = starRadius(page, view.k);
            const isSelected = page.id === selectedId;
            const isMatch = matchIds?.has(page.id) ?? false;
            const isStart = page.id === project.startPageId;
            const isApart = !layout.depthOf.has(page.id);
            const dimmed = (matchIds !== null && !isMatch) || !inHoverFocus(page.id);
            const showLabel =
              view.k >= LABEL_ALL_K ||
              (page.studied && view.k >= LABEL_STUDIED_K) ||
              isStart ||
              isSelected ||
              isMatch ||
              neighborIds.has(page.id) ||
              hoveredId === page.id;
            const labelFill =
              page.studied || isSelected || isMatch || isStart
                ? 'var(--star)'
                : neighborIds.has(page.id)
                  ? 'var(--star-ring)'
                  : 'var(--star-dim)';
            const title = displayTitle(page);

            return (
              <g
                key={page.id}
                data-star={page.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${title}${isStart ? ', start page' : ''}, ${page.studied ? 'studied' : 'not studied'}`}
                transform={`translate(${x} ${y})`}
                className={classes.star}
                opacity={dimmed ? 0.25 : isApart && hasStart ? 0.6 : 1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(page.id)}
                onKeyDown={(event) => onStarKeyDown(event, page.id)}
                onMouseEnter={() => setHoveredId(page.id)}
                onMouseLeave={() => setHoveredId((id) => (id === page.id ? null : id))}
              >
                <circle r={r + 14} fill="transparent" />
                <circle r={r + 6} className={classes.halo} fill="var(--star)" fillOpacity={0.15} />
                {isStart && !isSelected && (
                  <circle r={r + 6} fill="none" stroke="var(--star)" strokeWidth={1} strokeDasharray="1 3" />
                )}
                <circle
                  r={r + 10}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  stroke="var(--star)"
                  className={classes.focusRing}
                />
                {page.studied ? (
                  <circle r={r} fill="var(--star)" />
                ) : (
                  <circle r={r - 1} fill="var(--chart)" stroke="var(--star-ring)" strokeWidth={1.8} />
                )}
                {showLabel && (
                  <text
                    y={isSelected ? FINDER_RINGS[FINDER_RINGS.length - 1] + 16 : r + 18}
                    textAnchor="middle"
                    className={classes.label}
                    fill={labelFill}
                    stroke="var(--chart)"
                    fontSize={isSelected ? 16 : 14}
                    strokeWidth={4}
                  >
                    {title}
                  </text>
                )}
              </g>
            );
          })}

        {selectedPos && selectedId && (
          <g transform={`translate(${selectedPos.join(' ')})`}>
            <g key={selectedId} aria-hidden="true" pointerEvents="none">
              {FINDER_RINGS.map((r, i) => (
                <circle
                  key={r}
                  r={r}
                  fill="none"
                  className={classes.finderRing}
                  stroke="var(--glow)"
                  strokeWidth={1.6}
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
            </g>
          </g>
        )}
      </svg>

      <Group className={classes.toolbar} gap={6} role="toolbar" aria-label="Chart tools">
        <Button size="compact-sm" className={classes.toolButton} leftSection={<IconMaximize size={14} />} onClick={fit} title="Fit chart to view" aria-label="Fit chart to view">
          Fit
        </Button>
        <ActionIcon size={26} className={classes.toolButton} onClick={() => zoomBy(1.3)} disabled={!!cam && cam.k >= MAX_K} aria-label="Zoom in" title="Zoom in">
          <IconPlus size={14} />
        </ActionIcon>
        <ActionIcon size={26} className={classes.toolButton} onClick={() => zoomBy(1 / 1.3)} disabled={!!cam && cam.k <= MIN_K} aria-label="Zoom out" title="Zoom out">
          <IconMinus size={14} />
        </ActionIcon>
        <Button
          size="compact-sm"
          className={classes.toolButton}
          leftSection={<IconGrid4x4 size={14} />}
          onClick={() => setShowGrid((v) => !v)}
          data-active={showGrid || undefined}
          aria-pressed={showGrid}
          aria-label="Show grid"
          title="Show grid"
        >
          Grid
        </Button>
      </Group>

      {pages.length > 0 && hasStart && (
        <Text size="sm" lh={1.35} className={classes.hint} visibleFrom="md">
          Click a star to open it. Use + under it to add the pages that come next.
        </Text>
      )}

      {/* + under the open page, or the name field that replaces it */}
      {view && selectedPos && !composer && (
        <ActionIcon
          radius="xl"
          size={28}
          className={classes.addBelow}
          style={{ left: selectedPos[0], top: selectedPos[1] + FINDER_RINGS[2] + 26 }}
          onClick={() => {
            setDraft('');
            setComposer({ parentId: selectedId });
          }}
          aria-label="Add a page below"
          title="Add a page below"
        >
          <IconPlus size={16} />
        </ActionIcon>
      )}

      {view && composer && (
        <Box
          className={classes.composer}
          style={
            composer.parentId && selectedPos
              ? { left: selectedPos[0], top: selectedPos[1] + FINDER_RINGS[2] + 24 }
              : { left: size.w / 2, top: size.h / 2 - 40 }
          }
        >
          <TextInput
            id="new-page-name"
            autoFocus
            aria-label={composer.parentId ? 'Name of the page below' : 'Name of the first page'}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitDraft(false);
              } else if (e.key === 'Tab' && draft.trim()) {
                e.preventDefault();
                submitDraft(true);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeComposer();
              }
            }}
            onBlur={() => {
              if (draft.trim()) submitDraft(false);
              closeComposer();
            }}
            placeholder={composer.parentId ? 'Name the next page' : 'Name the first page'}
            classNames={{ input: classes.composerInput }}
          />
          <Text size="xs" mt={6} lh={1.35} className={classes.composerHelp}>
            Enter adds it here{composer.parentId ? ', Tab one level deeper' : ''}. Esc closes.
          </Text>
        </Box>
      )}

      {view && !composer && !hasStart && (
        <Stack className={classes.centerPrompt} gap="sm" align="center">
          <Title order={2} fz={24} c="var(--star)">
            {pages.length ? 'Where does this study start?' : 'An empty sky'}
          </Title>
          <Text size="sm" c="var(--star-ring)">
            {pages.length
              ? 'Open a page and mark it Start page, or add a new first page. Everything else hangs below it.'
              : 'Add the first page. The pages it leads to go below it, level by level.'}
          </Text>
          <Button
            color="finder.6"
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setDraft('');
              setComposer({ parentId: null });
            }}
          >
            Add the first page
          </Button>
        </Stack>
      )}

      {searchEmpty && (
        <Paper role="status" px="sm" py={6} className={classes.searchEmpty}>
          <Text size="sm">No page matches your search. Clear it to see the whole chart.</Text>
        </Paper>
      )}

      {pages.length > 0 && <ChartLegend onResetSample={project.isSample ? onResetSample : undefined} />}
    </div>
  );
}

/* ---------- Destination: the constellation of what you will know ---------- */

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * The destination: a crown of stars, one per page, like Corona Borealis.
 * Stars light from left to right as pages are studied; when every page is
 * studied the crown is complete and "Now I know <subject>" lights with it.
 */
function Destination({
  seed,
  studied,
  total,
  subject,
  origin,
  k,
  width,
}: {
  seed: string;
  studied: number;
  total: number;
  subject: string;
  origin: [number, number];
  k: number;
  width: number;
}) {
  const crown = useMemo(() => {
    const rand = seededRandom(`${seed}:${subject}`);
    const n = Math.max(total, 3);
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const angle = Math.PI * (1.12 + 0.76 * t);
      return {
        x: Math.cos(angle) * 230 + (rand() - 0.5) * 8,
        y: 170 + Math.sin(angle) * 95 + (rand() - 0.5) * 8,
        size: 1.6 + rand() * 1.8,
      };
    });
  }, [seed, subject, total]);

  const complete = total > 0 && studied >= total;
  const [ox, oy] = origin;
  const starScale = Math.min(1, Math.max(k, 0.6));

  return (
    <g role="img" aria-label={complete ? `Now I know ${subject}` : `${studied} of ${total} pages studied toward knowing ${subject}`}>
      <line x1={0} x2={width} y1={oy} y2={oy} stroke="var(--star-dim)" strokeWidth={1} strokeDasharray="2 6" />
      <g transform={`translate(${ox} ${oy})`}>
        {crown.slice(1).map((p, i) => {
          const a = crown[i];
          const lit = i + 1 < studied;
          return (
            <line
              key={`f${i}`}
              x1={a.x * k}
              y1={a.y * k}
              x2={p.x * k}
              y2={p.y * k}
              stroke={lit ? 'var(--star-ring)' : 'var(--star-dim)'}
              strokeWidth={lit ? 1.4 : 1}
              opacity={lit ? 1 : 0.35}
            />
          );
        })}
        {crown.map((p, i) => {
          const lit = i < studied;
          return (
            <circle
              key={`s${i}`}
              cx={p.x * k}
              cy={p.y * k}
              r={(lit ? p.size + 1.2 : p.size) * starScale}
              fill={lit ? 'var(--star)' : 'var(--star-dim)'}
              opacity={lit ? 1 : 0.45}
            />
          );
        })}
        <text
          y={205 * k}
          textAnchor="middle"
          className={classes.label}
          fill={complete ? 'var(--star)' : 'var(--star-ring)'}
          fontSize={Math.max(20, 36 * k)}
        >
          Now I know {subject}
        </text>
        <text y={205 * k + Math.max(22, 30 * k)} textAnchor="middle" fill="var(--star-dim)" fontSize={13}>
          {complete ? 'Every page studied' : `${studied} of ${total} pages studied`}
        </text>
      </g>
    </g>
  );
}

function ChartLegend({ onResetSample }: { onResetSample?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Group className={classes.legend} justify="space-between" gap="xs" fz={13}>
      <Group component="ul" gap="lg" p={0} m={0} style={{ listStyle: 'none' }} aria-label="Legend">
        <Group component="li" gap={6}>
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" fill="var(--star)" />
          </svg>
          Studied
        </Group>
        <Group component="li" gap={6}>
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="var(--chart)" stroke="var(--star-ring)" strokeWidth="1.8" />
          </svg>
          Not studied
        </Group>
        <Group component="li" gap={6}>
          <svg width="44" height="16" aria-hidden="true">
            <circle cx="4" cy="8" r="2.5" fill="var(--star)" />
            <circle cx="16" cy="8" r="4.5" fill="var(--star)" />
            <circle cx="34" cy="8" r="7" fill="var(--star)" />
          </svg>
          More written
        </Group>
        <Group component="li" gap={6}>
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" stroke="var(--star-ring)" strokeWidth="1.2" />
          </svg>
          Leads to
        </Group>
      </Group>
      {onResetSample && (
        <Group gap="xs" c="var(--star-dim)">
          Sample project
          {confirming ? (
            <>
              <UnstyledButton
                fw={700}
                className={classes.legendLink}
                onClick={() => {
                  onResetSample();
                  setConfirming(false);
                }}
              >
                Discard my edits
              </UnstyledButton>
              <UnstyledButton className={classes.legendLink} onClick={() => setConfirming(false)}>
                Keep
              </UnstyledButton>
            </>
          ) : (
            <UnstyledButton className={classes.legendLink} onClick={() => setConfirming(true)}>
              Reset
            </UnstyledButton>
          )}
        </Group>
      )}
    </Group>
  );
}
