'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { ChartPosition, Page, Project } from '../types/project.types';
import { areConnected, displayTitle, pagesInOrder, wordCount } from '../entities/project.entity';
import { FitIcon, GridIcon, MinusIcon, PlusIcon } from './icons';

/**
 * StarChart
 * The project drawn as a star atlas the author edits: pages are stars on a
 * coordinate grid and connections are lines between related stars.
 * Double-click the sky to add a page, drag a star to move it, drag the
 * selected star's handle onto another star to connect them.
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
}

interface StarChartProps {
  project: Project;
  selectedId: string | null;
  /** Page ids matching the current search, or null when not searching */
  matchIds: Set<string> | null;
  focusRequest: FocusRequest | null;
  onSelect: (pageId: string | null) => void;
  onOpen: (pageId: string) => void;
  onCreateAt: (position: ChartPosition) => void;
  onMove: (pageId: string, position: ChartPosition) => void;
  onConnect: (pageA: string, pageB: string) => void;
}

type Gesture =
  | { kind: 'pan'; x: number; y: number; cx: number; cy: number; moved: boolean }
  | { kind: 'move'; pageId: string; x: number; y: number; origin: ChartPosition; moved: boolean; position?: ChartPosition }
  | { kind: 'connect'; pageId: string; target: string | null };

export const COLUMN = 140;
const ROW = 180;
const MIN_K = 0.35;
const MAX_K = 2.5;
const LABEL_ALL_K = 0.8;
/** Below this zoom only selected, searched, linked and studied pages keep labels */
const LABEL_STUDIED_K = 0.55;
/** When fitting everything would zoom out past this, open closer in */
const MIN_FIT_K = 0.6;
const FINDER_RINGS = [20, 34, 50];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

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
  onOpen,
  onCreateAt,
  onMove,
  onConnect,
}: StarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCamState] = useState<Camera | null>(null);
  const camRef = useRef<Camera | null>(null);
  const frameRef = useRef<number>(0);
  const userMovedRef = useRef(false);
  const gestureRef = useRef<Gesture | null>(null);
  const [gestureKind, setGestureKind] = useState<Gesture['kind'] | null>(null);
  const [dragPreview, setDragPreview] = useState<{ pageId: string; position: ChartPosition } | null>(null);
  const [connectPointer, setConnectPointer] = useState<{ x: number; y: number } | null>(null);
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const setCam = useCallback((next: Camera) => {
    camRef.current = next;
    setCamState(next);
  }, []);

  const pages = useMemo(() => pagesInOrder(project), [project]);
  const pageById = useMemo(() => new Map(project.pages.map((p) => [p.id, p])), [project.pages]);

  const positionOf = useCallback(
    (page: Page) => (dragPreview?.pageId === page.id ? dragPreview.position : page.position),
    [dragPreview],
  );

  const fitCamera = useCallback(
    (w: number, h: number): Camera => {
      if (pages.length === 0) return { cx: COLUMN * 3, cy: ROW * 2, k: 1 };
      const xs = pages.map((p) => p.position.x);
      const ys = pages.map((p) => p.position.y);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const k = clampK(Math.min(w / (maxX - minX + 220), h / (maxY - minY + 190), 1.2));
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 + 10, k };
    },
    [pages],
  );

  const openingCamera = useCallback(
    (w: number, h: number): Camera => {
      const fitted = fitCamera(w, h);
      return fitted.k >= MIN_FIT_K ? fitted : { ...fitted, k: LABEL_ALL_K };
    },
    [fitCamera],
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

  // Track the chart's size; refit until the author moves the camera themselves
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ w, h });
      if (!userMovedRef.current || !camRef.current) setCam(openingCamera(w, h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [openingCamera, setCam]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const focusOn = useCallback(
    (pageId: string) => {
      const page = pageById.get(pageId);
      const current = camRef.current;
      if (!page || !current) return;
      userMovedRef.current = true;
      animateTo({ cx: page.position.x, cy: page.position.y, k: clampK(Math.max(current.k, 1)) }, 480);
    },
    [animateTo, pageById],
  );

  useEffect(() => {
    if (focusRequest) focusOn(focusRequest.pageId);
  }, [focusRequest, focusOn]);

  const zoomBy = (factor: number) => {
    const current = camRef.current;
    if (!current) return;
    userMovedRef.current = true;
    animateTo({ ...current, k: clampK(current.k * factor) }, 220);
  };

  const fit = () => {
    userMovedRef.current = false;
    animateTo(fitCamera(size.w, size.h), 320);
  };

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
      userMovedRef.current = true;
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

  const onStarPointerDown = (event: ReactPointerEvent, page: Page) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    startGesture(
      { kind: 'move', pageId: page.id, x: event.clientX, y: event.clientY, origin: page.position, moved: false },
      event,
    );
  };

  const onHandlePointerDown = (event: ReactPointerEvent, page: Page) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    startGesture({ kind: 'connect', pageId: page.id, target: null }, event);
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

    if (gesture.kind === 'pan') {
      userMovedRef.current = true;
      setCam({ cx: gesture.cx - dx / current.k, cy: gesture.cy - dy / current.k, k: current.k });
    } else {
      gesture.position = { x: gesture.origin.x + dx / current.k, y: gesture.origin.y + dy / current.k };
      setDragPreview({ pageId: gesture.pageId, position: gesture.position });
    }
  };

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    setGestureKind(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);

    if (gesture.kind === 'pan' && !gesture.moved && !cancelled) onSelect(null);
    if (gesture.kind === 'move') {
      if (!gesture.moved && !cancelled) onSelect(gesture.pageId);
      else if (gesture.position && !cancelled) onMove(gesture.pageId, gesture.position);
      setDragPreview(null);
    }
    if (gesture.kind === 'connect') {
      if (gesture.target && !cancelled) onConnect(gesture.pageId, gesture.target);
      setConnectPointer(null);
      setConnectTarget(null);
    }
  };

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest('[data-handle]')) return;
    const star = target.closest('[data-star]');
    if (star) {
      onOpen(star.getAttribute('data-star') as string);
      return;
    }
    const point = localPoint(event.clientX, event.clientY);
    onCreateAt(toWorld(point.x, point.y));
  };

  const onStarKeyDown = (event: KeyboardEvent<SVGGElement>, pageId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpen(pageId);
    }
  };

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of project.connections) {
      if (c.a === selectedId) ids.add(c.b);
      if (c.b === selectedId) ids.add(c.a);
    }
    return ids;
  }, [project.connections, selectedId]);

  const view = cam && size.w > 0 ? cam : null;
  const toScreen = (p: ChartPosition): [number, number] =>
    view ? [(p.x - view.cx) * view.k + size.w / 2, (p.y - view.cy) * view.k + size.h / 2] : [0, 0];

  const gridLines = useMemo(() => {
    if (!view) return { cols: [] as number[], rows: [] as number[] };
    const halfW = size.w / 2 / view.k;
    const halfH = size.h / 2 / view.k;
    const range = (min: number, max: number, step: number) => {
      const out: number[] = [];
      for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
      return out;
    };
    return {
      cols: range(view.cx - halfW, view.cx + halfW, COLUMN),
      rows: range(view.cy - halfH, view.cy + halfH, ROW),
    };
  }, [view, size.w, size.h]);

  const selected = selectedId ? pageById.get(selectedId) : undefined;
  const connectFrom = gestureKind === 'connect' && selected ? toScreen(positionOf(selected)) : null;
  const searchEmpty = matchIds !== null && matchIds.size === 0;
  const cursor =
    gestureKind === 'pan'
      ? 'cursor-grabbing'
      : gestureKind === 'move'
        ? 'cursor-move'
        : gestureKind === 'connect'
          ? 'cursor-crosshair'
          : 'cursor-grab';

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] overflow-hidden rounded bg-chart text-star">
      <svg
        ref={svgRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${cursor}`}
        role="group"
        aria-label={`Chart of ${project.title}. Double-click empty space to add a page. Drag to move, scroll to zoom.`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e)}
        onPointerCancel={(e) => endGesture(e, true)}
        onDoubleClick={onDoubleClick}
      >
        {view && showGrid && (
          <g aria-hidden="true">
            {gridLines.cols.map((x) => {
              const [sx] = toScreen({ x, y: 0 });
              const col = Math.round(x / COLUMN);
              return (
                <g key={`c${x}`}>
                  <line x1={sx} x2={sx} y1={0} y2={size.h} className="stroke-chart-grid" strokeWidth={1} />
                  {col >= 0 && col < ROMAN.length && (
                    <text x={sx + 5} y={66} className="fill-star-dim text-[11px]">
                      {ROMAN[col]}
                    </text>
                  )}
                </g>
              );
            })}
            {gridLines.rows.map((y) => {
              const [, sy] = toScreen({ x: 0, y });
              return <line key={`r${y}`} x1={0} x2={size.w} y1={sy} y2={sy} className="stroke-chart-grid" strokeWidth={1} />;
            })}
          </g>
        )}

        {view && (
          <g aria-hidden="true">
            {project.connections.map((c) => {
              const a = pageById.get(c.a);
              const b = pageById.get(c.b);
              if (!a || !b) return null;
              const [x1, y1] = toScreen(positionOf(a));
              const [x2, y2] = toScreen(positionOf(b));
              const raised = c.a === selectedId || c.b === selectedId;
              const dimmed = matchIds !== null && !(matchIds.has(c.a) && matchIds.has(c.b));
              return (
                <line
                  key={`${c.a}-${c.b}`}
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
            const [x, y] = toScreen(positionOf(page));
            const r = starRadius(page, view.k);
            const isSelected = page.id === selectedId;
            const isMatch = matchIds?.has(page.id) ?? false;
            const isTarget = page.id === connectTarget;
            const alreadyLinked = isTarget && selectedId ? areConnected(project, selectedId, page.id) : false;
            const dimmed = matchIds !== null && !isMatch;
            const showLabel =
              view.k >= LABEL_ALL_K ||
              (page.studied && view.k >= LABEL_STUDIED_K) ||
              isSelected ||
              isMatch ||
              isTarget ||
              neighborIds.has(page.id) ||
              hoveredId === page.id;
            const labelClass =
              page.studied || isSelected || isMatch || isTarget
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
                aria-label={`${title}, ${page.studied ? 'studied' : 'not studied'}. Press Enter to open.`}
                transform={`translate(${x} ${y})`}
                className="group cursor-pointer outline-none transition-opacity duration-200"
                opacity={dimmed ? 0.3 : 1}
                onPointerDown={(event) => onStarPointerDown(event, page)}
                onFocus={() => onSelect(page.id)}
                onKeyDown={(event) => onStarKeyDown(event, page.id)}
                onMouseEnter={() => setHoveredId(page.id)}
                onMouseLeave={() => setHoveredId((id) => (id === page.id ? null : id))}
              >
                <circle r={r + 14} fill="transparent" />
                <circle
                  r={r + 6}
                  className={`fill-star/15 transition-opacity duration-150 ${isTarget ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                />
                {isTarget && !alreadyLinked && (
                  <circle r={r + 8} fill="none" className="stroke-finder-glow" strokeWidth={2} />
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

        {view && selected && (
          <g transform={`translate(${toScreen(positionOf(selected)).join(' ')})`}>
            <g key={selected.id} aria-hidden="true" className="pointer-events-none">
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
            {/* Connection handle on the outer ring */}
            <g
              data-handle
              aria-hidden="true"
              transform={`translate(${FINDER_RINGS[2] * Math.SQRT1_2} ${-FINDER_RINGS[2] * Math.SQRT1_2})`}
              className="cursor-crosshair"
              onPointerDown={(event) => onHandlePointerDown(event, selected)}
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

      {pages.length > 0 && (
        <p className="pointer-events-none absolute right-4 top-4 hidden max-w-[40ch] text-right text-[13px] leading-snug text-star-ring md:block">
          Double-click empty sky to add a page. Drag a selected star&apos;s red handle onto another star to connect.
        </p>
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

      {pages.length > 0 && <ChartLegend isSample={!!project.isSample} />}
    </div>
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

function ChartLegend({ isSample }: { isSample: boolean }) {
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
      </ul>
      {isSample && <span className="text-star-dim">Sample project</span>}
    </div>
  );
}
