'use client';

import type { CSSProperties } from 'react';
import { Paper, Text, TextInput } from '@mantine/core';
import { IconInbox, IconLink, IconPencil } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { relativeTime } from '@/i18n/dates';
import { PaletteOptions } from '@/ui/Palette/PaletteOptions';
import classes from '../MarkdownEditor.module.css';
import { hostOf, shownText } from './InboxItemPrompt.helpers';
import { useInboxItemPrompt } from './useInboxItemPrompt';

/**
 * The / command's Inbox item: a search over what is waiting in the Inbox, where / was typed. ↑ ↓ choose,
 * Enter puts the item there, Esc (or clicking elsewhere) goes back to the text.
 */
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
  const { state, operations } = useInboxItemPrompt({ items, onCancel, onPick });

  return (
    <Paper withBorder shadow="md" role="dialog" aria-label={t('editor.inbox.dialog')} className={classes.inboxPrompt} style={style}>
      <TextInput
        {...state.fieldProps}
        size="sm"
        variant="unstyled"
        aria-label={t('editor.inbox.find')}
        placeholder={t('editor.inbox.find')}
        leftSection={<IconInbox size={16} stroke={1.5} />}
        value={state.query}
        autoFocus
        // Keeps Esc here: the drawer around the editor would close on it
        data-mantine-stop-propagation
        classNames={{ input: classes.inboxField }}
        onChange={(event) => operations.setQuery(event.currentTarget.value)}
        onBlur={operations.blur}
        onKeyDown={operations.keyDown}
      />
      <PaletteOptions
        id={state.listId}
        label={t('editor.inbox.list')}
        items={state.found}
        active={state.active}
        onActive={operations.setActive}
        onPick={operations.pick}
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
