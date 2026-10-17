'use client';

import type { CSSProperties } from 'react';
import { ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconCircle, IconCircleCheckFilled, IconBook2, IconCircleDotFilled } from '@tabler/icons-react';
import type { Page, PageColor } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { shade } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { PlacedNode, RootShape } from './mindLayout';
import classes from './MindMap.module.css';

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
export function place(n: PlacedNode, color: PageColor): CSSProperties {
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
export function RootNode({ shape, page, color, icon, studied, total, progress, selected, dimmed, mark, item, onSelect, onIntent }: RootNodeProps) {
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
