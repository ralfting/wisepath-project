'use client';

import { Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { Palette } from '@/ui/Palette/Palette';
import classes from './PagePicker.module.css';
import { PickerSteps } from './PickerSteps';
import type { PickedPage } from './PagePicker.helpers';

/**
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
  return (
    <Palette opened={opened} onClose={onClose} label={title} footer={t('inbox.picker.keys')}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5} className={classes.heading}>
        {title}
      </Text>
      {/* The palette mounts its content on each opening, so every pick starts at the paths */}
      <PickerSteps onPick={onPick} />
    </Palette>
  );
}
