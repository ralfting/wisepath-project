'use client';

import { useState } from 'react';
import { Text } from '@mantine/core';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { CaptureBox } from '@/features/inbox/capture';
import classes from './PagePicker.module.css';
import { PathsStep } from './PathsStep';
import { PagesStep } from './PagesStep';
import type { PickedPage } from './PagePicker.helpers';

/**
 * PagePicker
 * Where an Inbox item goes: a path, then one of its pages, each a searchable
 * list in the palette, from the keyboard alone. The path last opened comes
 * first. → (or Enter) opens a path's pages; ← at the start of the search, or
 * Backspace in an empty one, goes back to the paths.
 */

export function PagePicker({
  opened,
  title,
  onClose,
  onPick,
}: {
  opened: boolean;
  /** What picking does: "Add to…", "Make it a page linked from…" */
  title: string;
  onClose: () => void;
  onPick: (page: PickedPage) => void;
}) {
  const t = useT();
  const [path, setPath] = useState<PathSummary | null>(null);
  // The path last entered stays marked on the way back
  const [cameFrom, setCameFrom] = useState<string | null>(null);
  const close = () => {
    setPath(null);
    setCameFrom(null);
    onClose();
  };
  return (
    <CaptureBox opened={opened} onClose={close} label={title} footer={t('inbox.picker.keys')}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5} className={classes.heading}>
        {title}
      </Text>
      {path ? (
        <PagesStep
          path={path}
          onBack={() => {
            setCameFrom(path.id);
            setPath(null);
          }}
          onPick={(page) => {
            setPath(null);
            setCameFrom(null);
            onPick(page);
          }}
        />
      ) : (
        <PathsStep onPick={setPath} marked={cameFrom} />
      )}
    </CaptureBox>
  );
}
