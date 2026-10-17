'use client';

import type { HTMLAttributes } from 'react';
import { ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import type { PageColor, PageIcon as PageIconName } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { PageGlyph } from '@/features/paths/path';
import type { PlacedNode } from '../mindLayout';
import { PageIcon } from '../PageIcon';
import { STATUS_KEY, StatusIcon } from '../StatusIcon';
import type { TopicStatus } from '../StatusIcon';
import classes from './MindMap.module.css';
import { place } from './MindMap.helpers';

/**
 * A page on the map, as a button: a module drawn larger with its icon, title and what it holds; a topic as a pill
 * with its status (or page icon) and a counter when pages branch from it
 */
export function MindNode({
  node,
  look,
  status,
  counter,
  countText,
  label,
  progress,
  selected,
  dimmed,
  mark,
  item,
  onSelect,
  onPoint,
  onLeave,
  onIntent,
}: {
  node: PlacedNode;
  look: { readonly color: PageColor; readonly icon: PageIconName };
  status: TopicStatus;
  counter: { studied: number; total: number } | null;
  countText: (counter: { studied: number; total: number }) => string;
  label: string;
  progress: boolean;
  selected: boolean;
  dimmed: boolean;
  mark: Record<string, boolean | undefined>;
  item: HTMLAttributes<HTMLElement> & Record<string, unknown>;
  onSelect: (pageId: string) => void;
  onPoint: (pageId: string) => void;
  onLeave: () => void;
  onIntent?: (pageId: string) => void;
}) {
  const t = useT();
  const id = node.page.id;
  const title = displayTitle(node.page);
  const shared = {
    style: place(node, look.color),
    'data-status': progress ? status : undefined,
    'data-page-id': id,
    'data-selected': selected || undefined,
    'data-dimmed': dimmed || undefined,
    ...mark,
    ...item,
    onClick: () => onSelect(id),
    onPointerEnter: () => onPoint(id),
    onPointerLeave: onLeave,
    onFocus: () => onIntent?.(id),
    'aria-label': label,
    title,
  };
  if (node.module) {
    return (
      <UnstyledButton className={classes.module} {...shared}>
        <ThemeIcon size={40} radius="xl" variant="light" color={look.color} className={classes.moduleIcon}>
          <PageGlyph icon={look.icon} size={21} />
        </ThemeIcon>
        <span className={classes.moduleText}>
          <span className={classes.moduleTitle}>{title}</span>
          {(counter || progress) && <span className={classes.count}>{counter ? countText(counter) : t(STATUS_KEY[status])}</span>}
        </span>
        {progress && node.page.studied && <IconCircleCheckFilled size={18} color="var(--mantine-color-teal-6)" className={classes.moduleCheck} aria-hidden="true" />}
      </UnstyledButton>
    );
  }
  return (
    <UnstyledButton className={classes.topic} {...shared}>
      {progress ? <StatusIcon status={status} /> : <PageIcon />}
      <span className={classes.topicTitle}>{title}</span>
      {counter && <span className={classes.chip}>{progress ? `${counter.studied}/${counter.total}` : counter.total}</span>}
    </UnstyledButton>
  );
}
