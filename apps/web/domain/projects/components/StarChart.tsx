'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { ChartPosition, Page, Project } from '../types/project.types';
import { displayTitle, pagesInOrder, wordCount } from '../entities/project.entity';
import { LEVEL_GAP, SLOT_GAP, layoutLevels, references, subjectOf } from '../entities/levels';
import { FitIcon, GridIcon, MinusIcon, PlusIcon } from './icons';

/**
 * StarChart
 * The project as a star chart read top-down: the start page on level I, the
 * pages it links with [[Title]] on level II, and so on down to the destination,
 * a constellation that lights up as pages are studied. Pages not reached from
 * the start sit apart on the right.
 * Click a star to open it; drag the selected star's red handle onto another
 * star to link it; double-click empty sky to add a page.
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
  onCreateAt: (position: ChartPosition) => void;
  /** The author dragged from `fromId`'s handle onto `toId`: link it from the first */
  onLink: (fromId: string, toId: string) => void;
  /** Kept up to date with the chart point at the middle of the view */
  viewCenterRef?: { current: ChartPosition | null };
  /** Restores the sample project as shipped; shown only for the sample */
  onResetSample?: () => void;
}

type Gesture =
  | { kind: 'pan'; x: number; y: number; cx: number; cy: number; moved: boolean }
  | { kind: 'connect'; pageId: string; target: string | null };

export const COLUMN = SLOT_GAP;
const MIN_K = 0.3;
const MAX_K = 2.5;
const LABEL_ALL_K = 0.8;
/** Below this zoom only selected, searched, linked and studied pages keep labels */
const LABEL_STUDIED_K = 0.55;
/** When fitting everything would zoom out past this, open closer in */
const MIN_FIT_K = 0.55;
const FINDER_RINGS = [20, 34, 50];
const DESTINATION_HEIGHT = 270;
/** Screen height of the legend strip, kept clear when fitting */
const LEGEND_H = 44;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];

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
  onCreateAt,
  onLink,
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
  const [connectPointer, setConnectPointer] = useState<{ x: number; y: number } | null>(null);
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const setCam = useCallback(
    (next: Camera) => {
      camRef.current = next;
      if (viewCenterRef) viewCenterRef.current = { x: next.cx, y: next.cy };
      setCamState(next);
    },
    [viewCenterRef],
  );

  const pages = useMemo(() => pagesInOrder(project), [project]);
  const layout = useMemo(() => layoutLevels(project), [project]);
  const refs = useMemo(() => references(project), [project]);
  const positionOf = useCallback((pageId: string) => layout.positions.get(pageId) ?? { x: 0, y: 0 }, [layout]);

  const hasStart = layout.levels.length > 0;
  const studiedCount = project.pages.filter((p) => p.studied).length;

  /** Chart bounds: the descent, the column set apart and the destination */
  const bounds = useMemo(() => {
    const right = layout.apart.length ? layout.apartX + 80 : layout.halfWidth + 80;
    const bottom = hasStart ? layout.destinationY + DESTINATION_HEIGHT : Math.max(layout.apart.length * 80, 200);
    return { minX: -layout.halfWidth - 110, maxX: right + 30, minY: -130, maxY: bottom };
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

  const localPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  /** Point relative to the svg, in chart units */
  const toWorld = (sx: number, sy: number): ChartPosition => {
    const c = camRef.current;
    if (!c) return { x: 0, y: 0 };
    return { x: c.cx + (sx - size.w / 2) / c.k, y: c.cy + (sy - size.h / 2) / c.k };
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

  const starAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY)?.closest('[data-star]');
    return el?.getAttribute('data-star') ?? null;
  };

  const startGesture = (gesture: Gesture, event: ReactPointerEvent) => {
    cancelAnimationFrame(frameRef.current);
    gestureRef.current = gesture;
    setGestureKind(gesture.kind);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = camRef.current;
    if (event.button !== 0 || (event.target as Element).closest('[data-star],[data-handle]') || !current) return;
    startGesture({ kind: 'pan', x: event.clientX, y: event.clientY, cx: current.cx, cy: current.cy, moved: false }, event);
  };

  const onHandlePointerDown = (event: ReactPointerEvent, pageId: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    startGesture({ kind: 'connect', pageId, target: null }, event);
    setConnectPointer(localPoint(event.clientX, event.clientY));
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    const current = camRef.current;
    if (!gesture || !current) return;

    if (gesture.kind === 'connect') {
      setConnectPointer(localPoint(event.clientX, event.clientY));
      const hit = starAt(event.clientX, event.clientY);
      // Kept on the gesture too: pointerup can fire before this render commits
      gesture.target = hit && hit !== gesture.pageId ? hit : null;
      setConnectTarget(gesture.target);
      return;
    }

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

    if (gesture.kind === 'pan' && !gesture.moved && !cancelled) onSelect(null);
    if (gesture.kind === 'connect') {
      if (gesture.target && !cancelled) onLink(gesture.pageId, gesture.target);
      setConnectPointer(null);
      setConnectTarget(null);
    }
  };

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest('[data-handle],[data-star]')) return;
    const point = localPoint(event.clientX, event.clientY);
    onCreateAt(toWorld(point.x, point.y));
  };

  const onStarKeyDown = (event: KeyboardEvent<SVGGElement>, pageId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(pageId);
    }
  };

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of refs) {
      if (r.from === selectedId) ids.add(r.to);
      if (r.to === selectedId) ids.add(r.from);
    }
    for (const c of project.connections) {
      if (c.a === selectedId) ids.add(c.b);
      if (c.b === selectedId) ids.add(c.a);
    }
    return ids;
  }, [refs, project.connections, selectedId]);

  // Connections that no [[link]] already draws
  const looseConnections = useMemo(() => {
    const linked = new Set(refs.flatMap((r) => [`${r.from}|${r.to}`, `${r.to}|${r.from}`]));
    return project.connections.filter((c) => !linked.has(`${c.a}|${c.b}`));
  }, [refs, project.connections]);

  const view = cam && size.w > 0 ? cam : null;
  const toScreen = (p: ChartPosition): [number, number] =>
    view ? [(p.x - view.cx) * view.k + size.w / 2, (p.y - view.cy) * view.k + size.h / 2] : [0, 0];

  const verticals = useMemo(() => {
    if (!view) return [] as number[];
    const halfW = size.w / 2 / view.k;
    const out: number[] = [];
    for (let v = Math.ceil((view.cx - halfW) / SLOT_GAP) * SLOT_GAP + SLOT_GAP / 2; v <= view.cx + halfW; v += SLOT_GAP) {
      out.push(v);
    }
    return out;
  }, [view, size.w]);

  const selectedPos = selectedId && layout.positions.has(selectedId) ? toScreen(positionOf(selectedId)) : null;
  const connectFrom = gestureKind === 'connect' ? selectedPos : null;
  const searchEmpty = matchIds !== null && matchIds.size === 0;
  const cursor = gestureKind === 'pan' ? 'cursor-grabbing' : gestureKind === 'connect' ? 'cursor-crosshair' : 'cursor-grab';
  const separatorX = layout.halfWidth + SLOT_GAP * 0.8;

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] overflow-hidden rounded bg-chart text-star">
      <svg
        ref={svgRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${cursor}`}
        role="group"
        aria-label={`Chart of ${project.title}, read from the start page down. Double-click empty space to add a page. Drag to move, scroll to zoom.`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e)}
        onPointerCancel={(e) => endGesture(e, true)}
        onDoubleClick={onDoubleClick}
      >
        {view && showGrid && (
          <g aria-hidden="true">
            {verticals.map((x) => {
              const [sx] = toScreen({ x, y: 0 });
              return (
                <line key={`v${x}`} x1={sx} x2={sx} y1={0} y2={size.h} className="stroke-chart-grid" strokeWidth={1} opacity={0.6} />
              );
            })}
            {layout.levels.map((_, i) => {
              const [, sy] = toScreen({ x: 0, y: i * LEVEL_GAP });
              return (
                <g key={`lv${i}`}>
                  <line x1={0} x2={size.w} y1={sy} y2={sy} className="stroke-chart-grid" strokeWidth={1} />
                  <text x={12} y={sy - 8} className="fill-star-dim text-[11px]">
                    Level {ROMAN[i] ?? i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {view && layout.apart.length > 0 && (
          <g aria-hidden="true">
            {hasStart && (
              <line
                x1={toScreen({ x: separatorX, y: 0 })[0]}
                x2={toScreen({ x: separatorX, y: 0 })[0]}
                y1={0}
                y2={size.h}
                className="stroke-star-dim"
                strokeWidth={1}
                strokeDasharray="2 6"
              />
            )}
            <text
              x={toScreen({ x: layout.apartX, y: 0 })[0]}
              y={toScreen({ x: 0, y: -50 })[1]}
              textAnchor="middle"
              className="fill-star-dim text-[12px]"
            >
              Not linked yet
            </text>
          </g>
        )}

        {view && hasStart && (
          <Destination
            seed={project.id}
            studied={studiedCount}
            total={project.pages.length}
            subject={subjectOf(project)}
            origin={toScreen({ x: 0, y: layout.destinationY })}
            k={view.k}
            width={size.w}
          />
        )}

        {view && (
          <g aria-hidden="true">
            {looseConnections.map((c) => {
              const [x1, y1] = toScreen(positionOf(c.a));
              const [x2, y2] = toScreen(positionOf(c.b));
              const raised = c.a === selectedId || c.b === selectedId;
              return (
                <line
                  key={`c-${c.a}-${c.b}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={raised ? 'stroke-star-ring' : 'stroke-star-dim'}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  opacity={matchIds ? 0.25 : raised ? 0.9 : 0.5}
                />
              );
            })}
            {refs.map((r) => {
              const [x1, y1] = toScreen(positionOf(r.from));
              const [x2, y2] = toScreen(positionOf(r.to));
              const raised = r.from === selectedId || r.to === selectedId;
              const dimmed = matchIds !== null && !(matchIds.has(r.from) && matchIds.has(r.to));
              return (
                <line
                  key={`r-${r.from}-${r.to}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={raised ? 'stroke-star-ring' : 'stroke-star-dim'}
                  strokeWidth={raised ? 1.8 : 1.2}
                  opacity={dimmed ? 0.25 : raised ? 1 : 0.75}
                />
              );
            })}
          </g>
        )}

        {connectFrom && connectPointer && (
          <line
            aria-hidden="true"
            x1={connectFrom[0]}
            y1={connectFrom[1]}
            x2={connectPointer.x}
            y2={connectPointer.y}
            className="pointer-events-none stroke-finder-glow"
            strokeWidth={2}
            strokeDasharray={connectTarget ? undefined : '5 4'}
          />
        )}

        {view &&
          pages.map((page) => {
            const [x, y] = toScreen(positionOf(page.id));
            const r = starRadius(page, view.k);
            const isSelected = page.id === selectedId;
            const isMatch = matchIds?.has(page.id) ?? false;
            const isTarget = page.id === connectTarget;
            const isStart = page.id === project.startPageId;
            const dimmed = matchIds !== null && !isMatch;
            const showLabel =
              view.k >= LABEL_ALL_K ||
              (page.studied && view.k >= LABEL_STUDIED_K) ||
              isStart ||
              isSelected ||
              isMatch ||
              isTarget ||
              neighborIds.has(page.id) ||
              hoveredId === page.id;
            const labelClass =
              page.studied || isSelected || isMatch || isTarget || isStart
                ? 'fill-star'
                : neighborIds.has(page.id)
                  ? 'fill-star-ring'
                  : 'fill-star-dim';
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
                className="group cursor-pointer outline-none transition-opacity duration-200"
                opacity={dimmed ? 0.3 : 1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(page.id)}
                onKeyDown={(event) => onStarKeyDown(event, page.id)}
                onMouseEnter={() => setHoveredId(page.id)}
                onMouseLeave={() => setHoveredId((id) => (id === page.id ? null : id))}
              >
                <circle r={r + 14} fill="transparent" />
                <circle
                  r={r + 6}
                  className={`fill-star/15 transition-opacity duration-150 ${isTarget ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                />
                {isTarget && <circle r={r + 8} fill="none" className="stroke-finder-glow" strokeWidth={2} />}
                {isStart && !isSelected && (
                  <circle r={r + 6} fill="none" className="stroke-star" strokeWidth={1} strokeDasharray="1 3" />
                )}
                <circle
                  r={r + 10}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  className="stroke-star opacity-0 group-focus-visible:opacity-100"
                />
                {page.studied ? (
                  <circle r={r} className="fill-star" />
                ) : (
                  <circle r={r - 1} className="fill-chart stroke-star-ring" strokeWidth={1.8} />
                )}
                {showLabel && (
                  <text
                    y={isSelected ? FINDER_RINGS[FINDER_RINGS.length - 1] + 16 : r + 18}
                    textAnchor="middle"
                    className={`${labelClass} stroke-chart font-star italic`}
                    fontSize={isSelected ? 16 : 14}
                    strokeWidth={4}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {title}
                  </text>
                )}
              </g>
            );
          })}

        {selectedPos && selectedId && (
          <g transform={`translate(${selectedPos.join(' ')})`}>
            <g key={selectedId} aria-hidden="true" className="pointer-events-none">
              {FINDER_RINGS.map((r, i) => (
                <circle
                  key={r}
                  r={r}
                  fill="none"
                  className="finder-ring stroke-finder-glow"
                  strokeWidth={1.6}
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
            </g>
            {/* Link handle on the outer ring, pointing down the descent */}
            <g
              data-handle
              aria-hidden="true"
              transform={`translate(${FINDER_RINGS[2] * Math.SQRT1_2} ${FINDER_RINGS[2] * Math.SQRT1_2})`}
              className="cursor-crosshair"
              onPointerDown={(event) => onHandlePointerDown(event, selectedId)}
            >
              <circle r={14} fill="transparent" />
              <circle r={8} className="fill-finder-glow" />
              <path d="M-4 0h8M0 -4v8" className="stroke-chart" strokeWidth={1.8} strokeLinecap="round" />
            </g>
          </g>
        )}
      </svg>

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5" role="toolbar" aria-label="Chart tools">
        <ChartButton onClick={fit} label="Fit chart to view">
          <FitIcon />
          <span>Fit</span>
        </ChartButton>
        <ChartButton onClick={() => zoomBy(1.3)} label="Zoom in" disabled={!!cam && cam.k >= MAX_K}>
          <PlusIcon />
        </ChartButton>
        <ChartButton onClick={() => zoomBy(1 / 1.3)} label="Zoom out" disabled={!!cam && cam.k <= MIN_K}>
          <MinusIcon />
        </ChartButton>
        <ChartButton onClick={() => setShowGrid((v) => !v)} label="Show grid" pressed={showGrid}>
          <GridIcon />
          <span>Grid</span>
        </ChartButton>
      </div>

      {pages.length > 0 && hasStart && (
        <p className="pointer-events-none absolute right-4 top-4 hidden max-w-[40ch] text-right text-[13px] leading-snug text-star-ring md:block">
          Click a star to open it. Drag its red handle onto another star to link it from the first.
        </p>
      )}

      {pages.length > 0 && !hasStart && (
        <div className="pointer-events-none absolute left-1/2 top-16 w-[min(90%,30rem)] -translate-x-1/2 rounded bg-star px-4 py-3 text-center text-sm text-foreground">
          Choose where this study starts: open a page and mark it <span className="font-bold">Start page</span>. The
          pages it links become level II, theirs level III, down to the end.
        </div>
      )}

      {searchEmpty && (
        <p role="status" className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-star px-3 py-1.5 text-sm text-foreground">
          No page matches your search. Clear it to see the whole chart.
        </p>
      )}

      {pages.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-8 text-center">
          <div className="max-w-sm space-y-2">
            <p className="font-star text-2xl italic">An empty sky</p>
            <p className="text-sm text-star-ring">Double-click anywhere, or use New page, to add your first page.</p>
          </div>
        </div>
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
      <line x1={0} x2={width} y1={oy} y2={oy} className="stroke-star-dim" strokeWidth={1} strokeDasharray="2 6" />
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
              className={lit ? 'stroke-star-ring' : 'stroke-star-dim'}
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
              className={lit ? 'fill-star' : 'fill-star-dim'}
              opacity={lit ? 1 : 0.45}
            />
          );
        })}
        <text
          y={205 * k}
          textAnchor="middle"
          className={`font-star italic ${complete ? 'fill-star' : 'fill-star-ring'}`}
          fontSize={Math.max(20, 36 * k)}
        >
          Now I know {subject}
        </text>
        <text y={205 * k + Math.max(22, 30 * k)} textAnchor="middle" className="fill-star-dim text-[13px]">
          {complete ? 'Every page studied' : `${studied} of ${total} pages studied`}
        </text>
      </g>
    </g>
  );
}

function ChartButton({
  children,
  label,
  onClick,
  disabled,
  pressed,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="inline-flex h-8 items-center gap-1.5 rounded bg-star/10 px-2.5 text-[13px] text-star transition-colors hover:bg-star/20 focus-visible:outline-star disabled:opacity-40 aria-pressed:bg-star aria-pressed:text-chart"
    >
      {children}
    </button>
  );
}

function ChartLegend({ onResetSample }: { onResetSample?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 bg-chart/90 px-4 py-2 text-[13px] text-star-ring">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" className="fill-star" />
          </svg>
          Studied
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" className="fill-chart stroke-star-ring" strokeWidth="1.8" />
          </svg>
          Not studied
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="44" height="16" aria-hidden="true">
            <circle cx="4" cy="8" r="2.5" className="fill-star" />
            <circle cx="16" cy="8" r="4.5" className="fill-star" />
            <circle cx="34" cy="8" r="7" className="fill-star" />
          </svg>
          More written
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" className="stroke-star-ring" strokeWidth="1.2" />
          </svg>
          Linked in text
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" className="stroke-star-ring" strokeWidth="1" strokeDasharray="3 4" />
          </svg>
          Connected only
        </li>
      </ul>
      {onResetSample && (
        <span className="flex items-center gap-2 text-star-dim">
          Sample project
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onResetSample();
                  setConfirming(false);
                }}
                className="rounded px-1.5 py-0.5 font-bold text-star hover:bg-star/15"
              >
                Discard my edits
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded px-1.5 py-0.5 hover:bg-star/15">
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded px-1.5 py-0.5 underline underline-offset-4 hover:text-star">
              Reset
            </button>
          )}
        </span>
      )}
    </div>
  );
}
