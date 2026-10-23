'use client';

import { Group, Loader, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCloudCheck, IconCloudOff } from '@tabler/icons-react';
import type { SaveState } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';

/**
 * SaveStatus
 * Whether the latest changes reached WisePath: saving, saved, or waiting for
 * the connection (they are sent again on their own). When a change was
 * refused and undone, it says why instead.
 */
export function SaveStatus({ save, hideSaved = false }: { save: SaveState; hideSaved?: boolean }) {
  const t = useT();
  if (save.notice) {
    return (
      <Tooltip label={save.notice} multiline w={260}>
        <Group gap={6} wrap="nowrap" c="red" role="status">
          <IconAlertTriangle size={16} aria-hidden="true" />
          <Text size="sm" fw={500} truncate>
            {t('home.save.undone')}
          </Text>
        </Group>
      </Tooltip>
    );
  }
  if (save.status === 'offline') {
    return (
      <Tooltip label={t('home.save.offlineHint')} multiline w={260}>
        <Group gap={6} wrap="nowrap" c="orange" role="status">
          <IconCloudOff size={16} aria-hidden="true" />
          <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
            {t('home.save.offline')}
          </Text>
        </Group>
      </Tooltip>
    );
  }
  if (save.status === 'saving') {
    return (
      <Group gap={6} wrap="nowrap" c="dimmed" role="status">
        <Loader size={12} color="gray" />
        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
          {t('home.save.saving')}
        </Text>
      </Group>
    );
  }
  if (hideSaved) return null;
  return (
    <Group gap={6} wrap="nowrap" c="dimmed" role="status">
      <IconCloudCheck size={16} aria-hidden="true" />
      <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
        {t('home.save.saved')}
      </Text>
    </Group>
  );
}
