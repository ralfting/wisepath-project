'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
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

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of refs) {
      if (r.from === selectedId) ids.add(r.to);
      if (r.to === selectedId) ids.add(r.from);
    }
    return ids;
  }, [refs, selectedId]);

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
  const searchEmpty = matchIds !== null && matchIds.size === 0;
  const cursor = gestureKind === 'pan' ? 'cursor-grabbing' : 'cursor-grab';
  const separatorX = layout.halfWidth + SLOT_GAP * 0.8;

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] overflow-hidden rounded bg-chart text-star">
      <svg
        ref={svgRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${cursor}`}
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

        {view &&
          pages.map((page) => {
            const [x, y] = toScreen(positionOf(page.id));
            const r = starRadius(page, view.k);
            const isSelected = page.id === selectedId;
            const isMatch = matchIds?.has(page.id) ?? false;
            const isStart = page.id === project.startPageId;
            const dimmed = matchIds !== null && !isMatch;
            const showLabel =
              view.k >= LABEL_ALL_K ||
              (page.studied && view.k >= LABEL_STUDIED_K) ||
              isStart ||
              isSelected ||
              isMatch ||
              neighborIds.has(page.id) ||
              hoveredId === page.id;
            const labelClass =
              page.studied || isSelected || isMatch || isStart
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
                <circle r={r + 6} className="fill-star/15 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
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
          Click a star to open it. Use + under it to add the pages that come next.
        </p>
      )}

      {/* + under the open page, or the name field that replaces it */}
      {view && selectedPos && !composer && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            setComposer({ parentId: selectedId });
          }}
          aria-label="Add a page below"
          title="Add a page below"
          className="absolute grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-dashed border-star-ring bg-chart text-star transition-colors hover:border-solid hover:bg-finder-glow hover:text-chart"
          style={{ left: selectedPos[0], top: selectedPos[1] + FINDER_RINGS[2] + 26 }}
        >
          <PlusIcon />
        </button>
      )}

      {view && composer && (
        <div
          className="absolute w-60 -translate-x-1/2"
          style={
            composer.parentId && selectedPos
              ? { left: selectedPos[0], top: selectedPos[1] + FINDER_RINGS[2] + 24 }
              : { left: size.w / 2, top: size.h / 2 - 40 }
          }
        >
          <label htmlFor="new-page-name" className="sr-only">
            {composer.parentId ? 'Name of the page below' : 'Name of the first page'}
          </label>
          <input
            id="new-page-name"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
            className="h-9 w-full rounded border border-star-ring bg-chart px-3 text-center font-star text-[16px] italic text-star placeholder:font-sans placeholder:text-sm placeholder:not-italic placeholder:text-star-dim focus-visible:outline-finder-glow"
          />
          <p className="mt-1.5 text-center text-[12px] leading-snug text-star-ring">
            Enter adds it here{composer.parentId ? ', Tab one level deeper' : ''}. Esc closes.
          </p>
        </div>
      )}

      {view && !composer && !hasStart && (
        <div className="absolute left-1/2 top-1/2 w-[min(90%,26rem)] -translate-x-1/2 -translate-y-1/2 space-y-3 text-center">
          <p className="font-star text-2xl italic">{pages.length ? 'Where does this study start?' : 'An empty sky'}</p>
          <p className="text-sm text-star-ring">
            {pages.length
              ? 'Open a page and mark it Start page, or add a new first page. Everything else hangs below it.'
              : 'Add the first page. The pages it leads to go below it, level by level.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              setComposer({ parentId: null });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-finder px-4 text-sm font-bold text-finder-foreground hover:bg-finder/90"
          >
            <PlusIcon />
            Add the first page
          </button>
        </div>
      )}

      {searchEmpty && (
        <p role="status" className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-star px-3 py-1.5 text-sm text-foreground">
          No page matches your search. Clear it to see the whole chart.
        </p>
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
          Leads to
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
