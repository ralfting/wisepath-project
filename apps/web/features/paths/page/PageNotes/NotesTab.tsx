'use client';

import { Tabs } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';

/** NotesTab: the tab of the reader's own notes, marked private, with how many there are */
export function NotesTab({ count }: { count: number }) {
  const t = useT();
  return (
    <Tabs.Tab value="notes" leftSection={<IconLock size={14} stroke={1.5} aria-hidden />}>
      {t('page.tabs.notes', { count })}
    </Tabs.Tab>
  );
}
