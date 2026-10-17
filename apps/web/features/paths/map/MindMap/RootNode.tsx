'use client';

import type { CSSProperties } from 'react';
import { ThemeIcon, UnstyledButton } from '@mantine/core';
import type { Page, PageColor } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import type { RootShape } from '../mindLayout';
import classes from './MindMap.module.css';
import { placeBox } from './MindMap.helpers';
import { ProgressRing } from './ProgressRing';

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
