'use client';

import { Menu } from '@mantine/core';
import { IconNotebook, IconRoute } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { PageColor, ProjectKind } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';

/**
 * ProjectKind
 * The two kinds of path, as the app names and explains them: a study is open
 * notes with nothing to finish; a learning path is followed to the end and
 * tracks what was studied. Switching keeps the studied marks.
 */

/** label, hint and switchTo are message keys (home.kind.*) */
export const KIND_OPTIONS: ReadonlyArray<{
  value: ProjectKind;
  label: TranslationKey;
  hint: TranslationKey;
  switchTo: TranslationKey;
  icon: Icon;
  color: PageColor;
}> = [
  {
    value: 'study',
    label: 'home.kind.study.label',
    hint: 'home.kind.study.hint',
    switchTo: 'home.kind.study.switchTo',
    icon: IconNotebook,
    color: 'violet',
  },
  {
    value: 'learningPath',
    label: 'home.kind.learningPath.label',
    hint: 'home.kind.learningPath.hint',
    switchTo: 'home.kind.learningPath.switchTo',
    icon: IconRoute,
    color: 'teal',
  },
];

/** The menu item that turns a path into the other kind */
export function KindSwitchItem({ kind, onSwitch }: { kind: ProjectKind; onSwitch: (kind: ProjectKind) => void }) {
  const t = useT();
  const other = KIND_OPTIONS.find((o) => o.value !== kind)!;
  return (
    <Menu.Item leftSection={<other.icon size={15} />} onClick={() => onSwitch(other.value)}>
      {t(other.switchTo)}
    </Menu.Item>
  );
}
