'use client';

import type { KeyboardEvent } from 'react';
import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconFilePlus, IconFolderSymlink, IconPencil, IconTrash } from '@tabler/icons-react';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { dateTime, relativeTime } from '@/i18n/dates';
import classes from './InboxPage.module.css';
import { Source } from './Source';

/** One captured item in the Inbox: its text and source, and its actions (file it in a page, make it a page, delete it) */
export function InboxRow({
  item,
  ref,
  onKeyDown,
  onFile,
  onMakePage,
  onDelete,
}: {
  item: InboxItem;
  ref: (node: HTMLLIElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => void;
  onFile: () => void;
  onMakePage: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  // Only the address itself was written: its title says more
  const onlyAddress = item.url !== undefined && item.text.trim() === item.url.trim();
  const text = onlyAddress ? (item.title ?? item.url!) : item.text;

  return (
    <li ref={ref} tabIndex={0} className={classes.item} onKeyDown={onKeyDown}>
      <Text className={classes.text} lineClamp={6}>
        {text}
      </Text>
      <Group gap="xs" wrap="nowrap" className={classes.meta}>
        {item.url ? <Source item={item} /> : (
          <Group gap={6} wrap="nowrap">
            <IconPencil size={14} aria-hidden />
            <Text size="xs" c="dimmed">
              {t('inbox.item.written')}
            </Text>
          </Group>
        )}
        <Text size="xs" c="dimmed" aria-hidden>
          ·
        </Text>
        <Tooltip label={dateTime(item.createdAt, locale)}>
          <Text size="xs" c="dimmed" component="time" dateTime={item.createdAt}>
            {relativeTime(item.createdAt, Date.now(), locale)}
          </Text>
        </Tooltip>
      </Group>
      <Group gap="xs" className={classes.actions}>
        <Button size="compact-sm" variant="light" leftSection={<IconFolderSymlink size={15} />} onClick={onFile} aria-keyshortcuts="A">
          {t('inbox.item.file')}
        </Button>
        <Button size="compact-sm" variant="subtle" color="gray" leftSection={<IconFilePlus size={15} />} onClick={onMakePage}>
          {t('inbox.item.makePage')}
        </Button>
        <Tooltip label={t('inbox.item.delete')}>
          <ActionIcon variant="subtle" color="gray" aria-label={t('inbox.item.delete')} aria-keyshortcuts="D" onClick={onDelete} ml="auto">
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </li>
  );
}
