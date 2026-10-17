'use client';

import { Group, Text, Tooltip } from '@mantine/core';
import { IconCloudCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { dateTime, relativeTime } from '@/i18n/dates';

/** When the page was last edited, once its edits are saved */
export function SavedAt({ updatedAt }: { updatedAt: string }) {
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
