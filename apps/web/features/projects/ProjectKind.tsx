'use client';

import { Menu } from '@mantine/core';
import { IconNotebook, IconRoute } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { PageColor, ProjectKind } from '@wisepath/domain/projects';

/**
 * ProjectKind
 * The two kinds of path, as the app names and explains them: a study is open
 * notes with nothing to finish; a learning path is followed to the end and
 * tracks what was studied. Switching keeps the studied marks.
 */

export const KIND_OPTIONS: ReadonlyArray<{ value: ProjectKind; label: string; hint: string; icon: Icon; color: PageColor }> = [
  {
    value: 'study',
    label: 'Study',
    hint: 'Create and organise pages freely. No progress to track.',
    icon: IconNotebook,
    color: 'violet',
  },
  {
    value: 'learningPath',
    label: 'Learning path',
    hint: 'Follow it page by page, marking what you studied.',
    icon: IconRoute,
    color: 'teal',
  },
];

/** The menu item that turns a path into the other kind */
export function KindSwitchItem({ kind, onSwitch }: { kind: ProjectKind; onSwitch: (kind: ProjectKind) => void }) {
  const other = KIND_OPTIONS.find((o) => o.value !== kind)!;
  return (
    <Menu.Item leftSection={<other.icon size={15} />} onClick={() => onSwitch(other.value)}>
      Turn into {other.value === 'study' ? 'study' : 'learning path'}
    </Menu.Item>
  );
}
