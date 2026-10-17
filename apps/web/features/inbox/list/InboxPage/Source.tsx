'use client';

import { Anchor, Group, Image, Text } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import { useLinkPreview } from '@/useCases/paths';

/** Where an item came from: the site's icon and name, linked, and the video's moment */
export function Source({ item }: { item: InboxItem }) {
  const t = useT();
  const preview = useLinkPreview(item.url!);
  const host = (() => {
    try {
      return new URL(item.url!).hostname.replace(/^www\./, '');
    } catch {
      return item.url!;
    }
  })();
  const site = preview.status === 'ready' ? preview.preview.siteName : host;
  const favicon = preview.status === 'ready' ? preview.preview.favicon : null;
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      {favicon ? <Image src={favicon} alt="" w={14} h={14} /> : <IconLink size={14} aria-hidden />}
      <Anchor href={item.url} target="_blank" rel="noopener noreferrer" size="xs" truncate aria-label={t('inbox.item.openSource', { site })}>
        {site}
      </Anchor>
      {item.videoTime !== undefined && (
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {t('inbox.item.videoAt', { time: formatTime(item.videoTime) })}
        </Text>
      )}
    </Group>
  );
}
