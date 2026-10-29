'use client';

import { Group, Text, Tooltip } from '@mantine/core';
import { IconCloudCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { SaveStatus } from '@/features/paths/path';
import type { SaveState } from '@/useCases/paths';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { dateTime, relativeTime } from '@/i18n/dates';

/** Whether the page's edits reached WisePath, in its header: saved (when it was last edited on hover), or what is still on its way */
export function PageSaveStatus({ save, updatedAt }: { save: SaveState; updatedAt: string }) {
  return save.status === 'saved' && !save.notice ? <SavedAt updatedAt={updatedAt} /> : <SaveStatus save={save} />;
}

function SavedAt({ updatedAt }: { updatedAt: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [updatedAt]);
  if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) return null;
  return (
    // Just whether it is saved; when it was last edited shows on hover
    <Tooltip label={t('page.savedAt.hint', { when: relativeTime(updatedAt, now, locale), date: dateTime(updatedAt, locale) })}>
      <Group gap={6} wrap="nowrap" c="dimmed" visibleFrom="md" role="status">
        <IconCloudCheck size={16} aria-hidden="true" />
        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
          {t('page.savedAt.label')}
        </Text>
      </Group>
    </Tooltip>
  );
}
