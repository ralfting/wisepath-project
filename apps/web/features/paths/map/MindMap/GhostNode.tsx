'use client';

import type { HTMLAttributes } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import type { PlacedNode } from '../mindLayout';
import classes from './MindMap.module.css';
import { place } from './MindMap.helpers';

/** A page named with [[Title]] but not made yet: dashed and faint; opening it makes the page */
export function GhostNode({
  node,
  selected,
  item,
  onSelect,
}: {
  node: PlacedNode;
  selected: boolean;
  item: HTMLAttributes<HTMLElement> & Record<string, unknown>;
  onSelect: (pageId: string) => void;
}) {
  const t = useT();
  const label = t('map.ghost.label', { title: node.page.title });
  return (
    <UnstyledButton
      className={classes.topic}
      data-ghost
      data-page-id={node.page.id}
      data-selected={selected || undefined}
      // The colour only sets the variables a topic reads; a ghost's own styles override them
      style={place(node, 'blue')}
      {...item}
      onClick={() => onSelect(node.page.id)}
      aria-label={label}
      title={label}
    >
      <IconPlus size={14} stroke={2} aria-hidden="true" />
      <span className={classes.topicTitle}>{node.page.title}</span>
    </UnstyledButton>
  );
}
