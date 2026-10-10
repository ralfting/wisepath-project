'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Page, Project } from '../types/project.types';
import { isStudied, pagesInOrder } from '../entities/project.entity';
import { FitIcon, FocusIcon, GridIcon, MinusIcon, PlusIcon } from './icons';

/**
 * StarChart
 * The project drawn as a star atlas: pages are stars on a coordinate grid,
 * connections are the lines between them, and the next page sits inside
 * red finder rings. Positions are projected to screen space so star sizes
 * and labels stay constant while zoom spreads the chart.
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
  nextPageId: string | null;
  selectedId: string | null;
  /** Page ids matching the current search, or null when not searching */
  matchIds: Set<string> | null;
  focusRequest: FocusRequest | null;
  onSelect: (pageId: string | null) => void;
}

const COLUMN = 140;
const ROW = 180;
const MIN_K = 0.35;
const MAX_K = 2.5;
const LABEL_ALL_K = 0.8;
/** Below this zoom only the next, selected, searched and linked pages keep labels */
const LABEL_STUDIED_K = 0.55;
/** When fitting everything would zoom out past this, open on the next page instead */
const MIN_FIT_K = 0.6;
const PAD = { x: 110, top: 90, bottom: 80 };
const FINDER_RINGS = [20, 34, 50];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
const starRadius = (page: Page, k: number) =>
  (4 + Math.min(page.resources.length, 6) * 1.8) * Math.min(1, Math.max(0.65, k));

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StarChart({ project, nextPageId, selectedId, matchIds, focusRequest, onSelect }: StarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCamState] = useState<Camera | null>(null);
  const camRef = useRef<Camera | null>(null);
  const frameRef = useRef<number>(0);
  const userMovedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [dragging, setDragging] = useState(false);

  const setCam = useCallback((next: Camera) => {
    camRef.current = next;
    setCamState(next);
  }, []);

  const pages = useMemo(() => pagesInOrder(project), [project]);
  const pageById = useMemo(() => new Map(project.pages.map((p) => [p.id, p])), [project.pages]);

  const fitCamera = useCallback(
    (w: number, h: number): Camera => {
      if (pages.length === 0) return { cx: COLUMN * 3, cy: ROW * 2, k: 1 };
      const xs = pages.map((p) => p.position.x);
      const ys = pages.map((p) => p.position.y);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const k = clampK(Math.min(w / (maxX - minX + PAD.x * 2), h / (maxY - minY + PAD.top + PAD.bottom), 1.2));
      return { cx: (minX + maxX) / 2, cy: (minY - PAD.top + maxY + PAD.bottom) / 2, k };
    },
    [pages],
  );

  const openingCamera = useCallback(
    (w: number, h: number): Camera => {
      const fitted = fitCamera(w, h);
      const next = nextPageId ? pageById.get(nextPageId) : undefined;
      if (fitted.k >= MIN_FIT_K || !next) return fitted;
      return { cx: next.position.x, cy: next.position.y, k: LABEL_ALL_K };
    },
    [fitCamera, nextPageId, pageById],
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

  // Track the chart's size; refit until the learner moves the camera themselves
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

  const focusNext = () => {
    if (!nextPageId) return;
    onSelect(nextPageId);
    focusOn(nextPageId);
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

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('[data-star]') || !camRef.current) return;
    cancelAnimationFrame(frameRef.current);
    dragRef.current = { x: event.clientX, y: event.clientY, cx: camRef.current.cx, cy: camRef.current.cy, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const current = camRef.current;
    if (!drag || !current) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) setDragging(true);
    drag.moved = true;
    userMovedRef.current = true;
    setCam({ cx: drag.cx - dx / current.k, cy: drag.cy - dy / current.k, k: current.k });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) onSelect(null);
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onStarKeyDown = (event: KeyboardEvent<SVGGElement>, pageId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(pageId);
    }
  };

  // Pages linked to the selected page (or the next page) get their lines and labels raised
  const anchorId = selectedId ?? nextPageId;
  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of project.connections) {
      if (c.from === anchorId) ids.add(c.to);
      if (c.to === anchorId) ids.add(c.from);
    }
    return ids;
  }, [project.connections, anchorId]);

  const view = cam && size.w > 0 ? cam : null;
  const toScreen = (x: number, y: number): [number, number] =>
    view ? [(x - view.cx) * view.k + size.w / 2, (y - view.cy) * view.k + size.h / 2] : [0, 0];

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

  const nextPage = nextPageId ? pageById.get(nextPageId) : undefined;
  const searchEmpty = matchIds !== null && matchIds.size === 0;

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] overflow-hidden rounded bg-chart text-star">
      <svg
        ref={svgRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="group"
        aria-label={`Chart of ${project.title}. Drag to move, scroll to zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {view && showGrid && (
          <g aria-hidden="true">
            {gridLines.cols.map((x) => {
              const [sx] = toScreen(x, 0);
              const col = Math.round(x / COLUMN);
              return (
                <g key={`c${x}`}>
                  <line x1={sx} x2={sx} y1={0} y2={size.h} className="stroke-chart-grid" strokeWidth={1} />
                  {col >= 0 && col < ROMAN.length && (
                    <text x={sx + 5} y={66} className="fill-chart-tick text-[11px]">
                      {ROMAN[col]}
                    </text>
                  )}
                </g>
              );
            })}
            {gridLines.rows.map((y) => {
              const [, sy] = toScreen(0, y);
              return <line key={`r${y}`} x1={0} x2={size.w} y1={sy} y2={sy} className="stroke-chart-grid" strokeWidth={1} />;
            })}
          </g>
        )}

        {view && (
          <g aria-hidden="true">
            {project.connections.map((c) => {
              const a = pageById.get(c.from);
              const b = pageById.get(c.to);
              if (!a || !b) return null;
              const [x1, y1] = toScreen(a.position.x, a.position.y);
              const [x2, y2] = toScreen(b.position.x, b.position.y);
              const raised = c.from === anchorId || c.to === anchorId;
              const dimmed = matchIds !== null && !(matchIds.has(c.from) && matchIds.has(c.to));
              return (
                <line
                  key={`${c.from}-${c.to}`}
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

        {view &&
          pages.map((page) => {
            const [x, y] = toScreen(page.position.x, page.position.y);
            const r = starRadius(page, view.k);
            const studied = isStudied(page);
            const isNext = page.id === nextPageId;
            const isSelected = page.id === selectedId;
            const isMatch = matchIds?.has(page.id) ?? false;
            const dimmed = matchIds !== null && !isMatch;
            const showLabel =
              view.k >= LABEL_ALL_K ||
              (studied && view.k >= LABEL_STUDIED_K) ||
              isNext ||
              isSelected ||
              isMatch ||
              neighborIds.has(page.id) ||
              hoveredId === page.id;
            const labelClass =
              studied || isNext || isSelected || isMatch
                ? 'fill-star'
                : neighborIds.has(page.id)
                  ? 'fill-star-ring'
                  : 'fill-star-dim';
            const count = page.resources.length;

            return (
              <g
                key={page.id}
                data-star
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${page.title}, ${studied ? 'studied' : 'not studied'}${isNext ? ', next up' : ''}, ${count} ${count === 1 ? 'resource' : 'resources'}`}
                transform={`translate(${x} ${y})`}
                className="group cursor-pointer outline-none transition-opacity duration-200"
                opacity={dimmed ? 0.3 : 1}
                onClick={() => onSelect(page.id)}
                onKeyDown={(event) => onStarKeyDown(event, page.id)}
                onMouseEnter={() => setHoveredId(page.id)}
                onMouseLeave={() => setHoveredId((id) => (id === page.id ? null : id))}
              >
                <circle r={r + 14} fill="transparent" />
                <circle
                  r={r + 6}
                  className="fill-star/15 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                />
                {isSelected && !isNext && (
                  <circle r={r + 7} fill="none" className="stroke-star" strokeWidth={1.5} />
                )}
                <circle
                  r={r + 10}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  className="stroke-star opacity-0 group-focus-visible:opacity-100"
                />
                {studied ? (
                  <circle r={r} className="fill-star" />
                ) : (
                  <circle r={r - 1} className="fill-chart stroke-star-ring" strokeWidth={1.8} />
                )}
                {showLabel && (
                  <text
                    y={isNext ? FINDER_RINGS[FINDER_RINGS.length - 1] + 16 : r + 18}
                    textAnchor="middle"
                    className={`${labelClass} stroke-chart font-star italic`}
                    fontSize={isNext || isSelected ? 16 : 14}
                    strokeWidth={4}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {page.title}
                  </text>
                )}
              </g>
            );
          })}

        {view && nextPage && (
          <g
            key={`${nextPage.id}`}
            aria-hidden="true"
            className="pointer-events-none"
            transform={`translate(${toScreen(nextPage.position.x, nextPage.position.y).join(' ')})`}
          >
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
        )}
      </svg>

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5" role="toolbar" aria-label="Chart tools">
        <ChartButton onClick={focusNext} disabled={!nextPageId} label="Focus next">
          <FocusIcon />
          <span>Focus next</span>
        </ChartButton>
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

      {searchEmpty && (
        <p role="status" className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-star px-3 py-1.5 text-sm text-foreground">
          No page matches your search. Clear it to see the whole chart.
        </p>
      )}

      {pages.length === 0 && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center">
          <div className="max-w-sm space-y-2">
            <p className="font-star text-2xl italic">No pages yet</p>
            <p className="text-sm text-star-ring">
              Pages you add appear here as stars, connected in the order you study them.
            </p>
          </div>
        </div>
      )}

      {pages.length > 0 && <ChartLegend />}

      {project.isSample && (
        <p className="absolute bottom-3 right-4 text-xs text-star-dim">Sample project</p>
      )}
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

function ChartLegend() {
  return (
    <ul
      className="absolute bottom-2 left-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded bg-chart/85 px-2 py-1 text-[13px] text-star-ring"
      aria-label="Legend"
    >
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
        <svg width="18" height="18" aria-hidden="true">
          <circle cx="9" cy="9" r="7.5" fill="none" className="stroke-finder-glow" strokeWidth="1.6" />
          <circle cx="9" cy="9" r="3.5" fill="none" className="stroke-finder-glow" strokeWidth="1.6" />
        </svg>
        Next up
      </li>
      <li>Star size: number of resources</li>
    </ul>
  );
}
