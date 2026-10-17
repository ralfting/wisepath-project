'use client';

import { UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from './MindMap.module.css';
import { PLUS } from './MindMap.helpers';

/**
 * The + on a page's outer edge that adds a page branching from it. Shown while the page is pointed at, focused or
 * open (CSS); the keyboard has N, so it is out of the tab order
 */
export function BranchPlus({ pageId, title, x, y, onAdd }: { pageId: string; title: string; x: number; y: number; onAdd: (pageId: string) => void }) {
  const t = useT();
  return (
    <UnstyledButton
      className={classes.plus}
      style={{ left: x - PLUS / 2, top: y - PLUS / 2 }}
      tabIndex={-1}
      aria-hidden="true"
      title={t('map.branch.add', { title })}
      onClick={() => onAdd(pageId)}
    >
      <IconPlus size={14} stroke={2.4} />
    </UnstyledButton>
  );
}
