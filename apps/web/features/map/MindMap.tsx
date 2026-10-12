'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ActionIcon, Group, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDotFilled,
  IconFocusCentered,
  IconMaximize,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import type { Page, PageColor, Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, progressOf, projectProgress } from '@wisepath/domain/projects';
import { PageGlyph, shade } from '@/features/shared/look';
import { MODULE, ROOT_SIZE, TOPIC, layoutMind } from './mindLayout';
import type { Point, Side } from './mindLayout';
import classes from './MindMap.module.css';

/**
 * MindMap
 * The project as a radial map: root in the middle, modules around it, topics
 * beside their module, and [[link]] cross references as blue arrows. Drag or
 * scroll to pan, pinch or Ctrl/⌘ + scroll to zoom. Every page is a button.
 */

export interface FocusRequest {
  pageId: string;
  nonce: number;
}

interface MindMapProps {
  project: Project;
  selectedId: string | null;
  /** The topic "Continue studying" leads to */
  currentId: string | null;
  /** Pages matching the search; null when not searching */
  matchIds: Set<string> | null;
  focusRequest: FocusRequest | null;
  onSelect: (pageId: string) => void;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.2;
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

export function MindMap({ project, selectedId, currentId, matchIds, focusRequest, onSelect }: MindMapProps) {
  const layout = useMemo(() => layoutMind(project), [project]);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  const fit = useCallback(
    (w: number, h: number): View => {
      const { minX, minY, maxX, maxY } = layout.bounds;
      const pad = 48;
      const whole = Math.min((w - pad) / (maxX - minX), (h - pad) / (maxY - minY), 1);
      // On a phone the whole map would be unreadable: start readable, around the root
      if (w < 640 && whole < 0.7) return { k: 0.7, x: w / 2, y: h / 2 };
      const k = clampZoom(whole);
      return { k, x: w / 2 - k * ((minX + maxX) / 2), y: h / 2 - k * ((minY + maxY) / 2) };
    },
    [layout.bounds],
  );

  // Track the viewport size; fit the map the first time it is known
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { w: entry.contentRect.width, h: entry.contentRect.height };
      setSize(next);
      setView((v) => v ?? fit(next.w, next.h));
    });
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

  // Bring a page into view when asked from outside the map (search, related pages)
  useEffect(() => {
    if (!focusRequest || !size) return;
    const c = layout.centres.get(focusRequest.pageId as Page['id']);
    if (!c) return;
    smoothly((v) => {
      const sx = v.x + c.x * v.k;
      const sy = v.y + c.y * v.k;
      const margin = 120;
      if (sx > margin && sx < size.w - margin && sy > margin && sy < size.h - margin) return v;
      return { k: v.k, x: size.w / 2 - c.x * v.k, y: size.h / 2 - c.y * v.k };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

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

  const fullscreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const dimmed = (id: string) => matchIds !== null && !matchIds.has(id);
  const touchesSelection = (from: string, to: string) => selectedId !== null && (from === selectedId || to === selectedId);
  const { minX, minY, maxX, maxY } = layout.bounds;
  const pad = 40;
  const rootLook = lookOf(project, layout.root.page.id);
  const overall = projectProgress(project);

  return (
    <div ref={frameRef} className={classes.frame}>
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
              {layout.tree.map((line) => {
                const color = lookOf(project, line.to).color;
                return (
                  <path
                    key={line.key}
                    d={line.d}
                    fill="none"
                    stroke={shade(color, line.from === layout.root.page.id ? 4 : 3)}
                    strokeWidth={line.from === layout.root.page.id ? 2.4 : 1.6}
                    opacity={dimmed(line.to) ? 0.25 : 0.9}
                  />
                );
              })}
              {layout.cross.map((line) => (
                <path
                  key={line.key}
                  d={line.d}
                  fill="none"
                  stroke="var(--mantine-color-blue-6)"
                  strokeWidth={touchesSelection(line.from, line.to) ? 3 : 2.2}
                  strokeLinecap="round"
                  markerEnd="url(#wp-arrow)"
                  opacity={selectedId && !touchesSelection(line.from, line.to) ? 0.45 : 0.95}
                />
              ))}
            </svg>

            <RootNode
              page={layout.root.page}
              color={rootLook.color}
              icon={<PageGlyph icon={rootLook.icon} size={30} />}
              studied={overall.studied}
              total={overall.total}
              selected={selectedId === layout.root.page.id}
              dimmed={dimmed(layout.root.page.id)}
              onSelect={onSelect}
            />

            {layout.modules.map((m) => {
              const look = lookOf(project, m.page.id);
              const progress = progressOf(m.topics.map((t) => t.page));
              return (
                <div key={m.page.id}>
                  <UnstyledButton
                    className={classes.module}
                    style={place(m.at, MODULE, look.color)}
                    data-selected={selectedId === m.page.id || undefined}
                    data-dimmed={dimmed(m.page.id) || undefined}
                    onClick={() => onSelect(m.page.id)}
                    aria-label={`${displayTitle(m.page)}, module, ${progress.studied} of ${progress.total} studied`}
                  >
                    <ThemeIcon size={40} radius="xl" variant="light" color={look.color} className={classes.moduleIcon}>
                      <PageGlyph icon={look.icon} size={21} />
                    </ThemeIcon>
                    <span className={classes.moduleText}>
                      <span className={classes.moduleTitle}>{displayTitle(m.page)}</span>
                      <span className={classes.count}>
                        {progress.studied}/{progress.total}
                      </span>
                    </span>
                  </UnstyledButton>
                  {m.topics.map((t) => {
                    const status = t.page.studied ? 'done' : t.page.id === currentId ? 'current' : 'todo';
                    return (
                      <UnstyledButton
                        key={t.page.id}
                        className={classes.topic}
                        style={placeTopic(t.at, m.side, look.color)}
                        data-status={status}
                        data-selected={selectedId === t.page.id || undefined}
                        data-dimmed={dimmed(t.page.id) || undefined}
                        onClick={() => onSelect(t.page.id)}
                        aria-label={`${displayTitle(t.page)}, ${STATUS_LABEL[status].toLowerCase()}`}
                      >
                        <StatusIcon status={status} />
                        <span className={classes.topicTitle}>{displayTitle(t.page)}</span>
                      </UnstyledButton>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Stack gap={0} className={classes.controls}>
        <Tooltip label="Zoom in" position="right">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Zoom out" position="right">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
            <IconMinus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Fit the map" position="right">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={recentre} aria-label="Fit the map">
            <IconFocusCentered size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Full screen" position="right">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={fullscreen} aria-label="Full screen">
            <IconMaximize size={18} />
          </ActionIcon>
        </Tooltip>
      </Stack>

      <Group gap="lg" className={classes.legend} aria-label="Legend">
        {(['done', 'current', 'todo'] as const).map((s) => (
          <Group key={s} gap={6} wrap="nowrap">
            <StatusIcon status={s} />
            <Text size="sm" c="dimmed">
              {STATUS_LABEL[s]}
            </Text>
          </Group>
        ))}
        <Group gap={6} wrap="nowrap">
          <svg width="26" height="10" aria-hidden="true">
            <path d="M1,5 L19,5" stroke="var(--mantine-color-blue-6)" strokeWidth="2.2" />
            <path d="M17,1 L25,5 L17,9 z" fill="var(--mantine-color-blue-6)" />
          </svg>
          <Text size="sm" c="dimmed">
            Cross reference
          </Text>
        </Group>
      </Group>
    </div>
  );
}

export type TopicStatus = 'done' | 'current' | 'todo';

export const STATUS_LABEL: Record<TopicStatus, string> = {
  done: 'Studied',
  current: 'Up next',
  todo: 'Not started',
};

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

/** Absolute position of a node centred on `at`, with its colour for the CSS module */
function place(at: Point, size: { w: number; h: number }, color: PageColor): CSSProperties {
  return { left: at.x - size.w / 2, top: at.y - size.h / 2, width: size.w, height: size.h, ...tints(color) } as CSSProperties;
}

/** A topic grows away from its module: `at` is its inner end */
function placeTopic(at: Point, side: Side, color: PageColor): CSSProperties {
  return {
    left: at.x,
    top: at.y - TOPIC.h / 2,
    height: TOPIC.h,
    minWidth: TOPIC.w,
    maxWidth: TOPIC.maxW,
    transform: side === -1 ? 'translateX(-100%)' : undefined,
    ...tints(color),
  } as CSSProperties;
}

interface RootNodeProps {
  page: Page;
  color: PageColor;
  icon: React.ReactNode;
  studied: number;
  total: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: (pageId: string) => void;
}

/** The root: a circle with the map's progress drawn as a ring around it */
function RootNode({ page, color, icon, studied, total, selected, dimmed, onSelect }: RootNodeProps) {
  const r = ROOT_SIZE / 2 - 5;
  const circumference = 2 * Math.PI * r;
  const share = total ? studied / total : 0;
  return (
    <UnstyledButton
      className={classes.root}
      style={place({ x: 0, y: 0 }, { w: ROOT_SIZE, h: ROOT_SIZE }, color)}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      onClick={() => onSelect(page.id)}
      aria-label={`${displayTitle(page)}, ${studied} of ${total} topics studied`}
    >
      <svg className={classes.ring} width={ROOT_SIZE} height={ROOT_SIZE} aria-hidden="true">
        <defs>
          <linearGradient id="wp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--mantine-color-teal-5)" />
            <stop offset="100%" stopColor="var(--mantine-color-cyan-5)" />
          </linearGradient>
        </defs>
        <circle cx={ROOT_SIZE / 2} cy={ROOT_SIZE / 2} r={r} fill="none" stroke="var(--mantine-color-gray-2)" strokeWidth="7" />
        <circle
          cx={ROOT_SIZE / 2}
          cy={ROOT_SIZE / 2}
          r={r}
          fill="none"
          stroke="url(#wp-ring)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform={`rotate(-90 ${ROOT_SIZE / 2} ${ROOT_SIZE / 2})`}
        />
      </svg>
      <ThemeIcon size={52} radius="xl" variant="light" color={color}>
        {icon}
      </ThemeIcon>
      <span className={classes.rootTitle}>{displayTitle(page)}</span>
      <span className={classes.count}>
        {studied}/{total}
      </span>
    </UnstyledButton>
  );
}
