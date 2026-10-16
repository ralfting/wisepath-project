'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Paper, Text, TextInput } from '@mantine/core';
import { IconInbox, IconLink, IconPencil } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { relativeTime } from '@/i18n/dates';
import { PaletteOptions, paletteFieldProps, usePaletteId, usePaletteKeys } from '@/features/capture';
import classes from './MarkdownEditor.module.css';

/**
 * InboxItemPrompt
 * The / command's Inbox item: a search over what is waiting in the Inbox, where / was typed. ↑ ↓ choose,
 * Enter puts the item there, Esc (or clicking elsewhere) goes back to the text.
 */

/** What an item shows: its own words, or its link's title when only the address was written */
const shownText = (item: InboxItem) => (item.url !== undefined && item.text.trim() === item.url.trim() ? (item.title ?? item.url) : item.text);

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function InboxItemPrompt({
  items,
  style,
  onCancel,
  onPick,
}: {
  /** Null while the Inbox loads, or when it can't be reached */
  items: ReadonlyArray<InboxItem> | null;
  style: CSSProperties;
  onCancel: () => void;
  onPick: (item: InboxItem) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((item) => `${item.text} ${item.title ?? ''} ${item.url ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);
  const keys = usePaletteKeys(found, onPick);

  return (
    <Paper withBorder shadow="md" role="dialog" aria-label={t('editor.inbox.dialog')} className={classes.inboxPrompt} style={style}>
      <TextInput
        {...paletteFieldProps(listId, keys.active, found.length)}
        size="sm"
        variant="unstyled"
        aria-label={t('editor.inbox.find')}
        placeholder={t('editor.inbox.find')}
        leftSection={<IconInbox size={16} stroke={1.5} />}
        value={query}
        autoFocus
        // Keeps Esc here: the drawer around the editor would close on it
        data-mantine-stop-propagation
        classNames={{ input: classes.inboxField }}
        onChange={(e) => setQuery(e.currentTarget.value)}
        // Clicking elsewhere on the page cancels; switching to another window does not
        onBlur={() => {
          if (document.hasFocus()) onCancel();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
            return;
          }
          keys.onKeyDown(e);
        }}
      />
      <PaletteOptions
        id={listId}
        label={t('editor.inbox.list')}
        items={found}
        active={keys.active}
        onActive={keys.setActive}
        onPick={onPick}
        getKey={(item) => item.id}
        empty={items === null ? t('editor.inbox.loading') : items.length === 0 ? t('editor.inbox.empty') : t('editor.inbox.noMatch')}
      >
        {(item) => (
          <span className={classes.inboxItem}>
            <Text size="sm" truncate>
              {shownText(item)}
            </Text>
            <Text size="xs" c="dimmed" truncate className={classes.inboxMeta}>
              {item.url ? <IconLink size={12} aria-hidden /> : <IconPencil size={12} aria-hidden />}
              {item.url ? hostOf(item.url) : t('editor.inbox.written')}
              {item.videoTime !== undefined && ` · ${formatTime(item.videoTime)}`}
              {` · ${relativeTime(item.createdAt, Date.now(), locale)}`}
            </Text>
          </span>
        )}
      </PaletteOptions>
      <Text size="xs" c="dimmed" className={classes.inboxKeys}>
        {t('editor.inbox.keys')}
      </Text>
    </Paper>
  );
}
