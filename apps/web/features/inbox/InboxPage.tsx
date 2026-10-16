'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ActionIcon, Anchor, Button, Group, Image, Kbd, Loader, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconFilePlus, IconFolderSymlink, IconInbox, IconLink, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { dateTime, relativeTime } from '@/i18n/dates';
import { useDiscard, useFileItem, useInbox, useMakePage } from '@/useCases/inbox';
import { useLinkPreview } from '@/useCases/projects';
import { AppFrame } from '@/features/shell/AppFrame';
import { Toast, openCapture, useCaptureKeys } from '@/features/capture';
import type { ToastMessage } from '@/features/capture';
import { mapWithPageHref } from '@/features/shared/routes';
import { PagePicker } from './PagePicker';
import type { PickedPage } from './PagePicker';
import classes from './InboxPage.module.css';

/**
 * InboxPage
 * Everything captured and not yet added to a page, newest first. Each item can be added
 * to a page, made a page of its own, or deleted, from the keyboard too:
 * ↑ ↓ move between items, A adds to a page, D deletes, Enter opens where it came from.
 */

type Picking = { readonly item: InboxItem; readonly mode: 'file' | 'makePage' } | null;

export function InboxPage() {
  const t = useT();
  const router = useRouter();
  const inbox = useInbox();
  const { discard, restore } = useDiscard();
  const fileItem = useFileItem();
  const makePage = useMakePage();
  const keys = useCaptureKeys();
  const [picking, setPicking] = useState<Picking>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setToast(null), []);
  const items = useMemo(() => (inbox.status === 'ready' ? inbox.items : []), [inbox]);

  // Which item has the keyboard; after one leaves, its neighbour takes it
  const refs = useRef(new Map<string, HTMLLIElement>());
  const [focusAt, setFocusAt] = useState<number | null>(null);
  useEffect(() => {
    if (focusAt === null || picking) return;
    const item = items[Math.min(focusAt, items.length - 1)];
    if (item) refs.current.get(item.id)?.focus();
    setFocusAt(null);
  }, [focusAt, items, picking]);

  const say = (text: string, action?: ToastMessage['action']) => setToast({ text, key: Date.now(), ...(action ? { action } : {}) });

  const remove = (item: InboxItem) => {
    setFocusAt(items.indexOf(item));
    discard(item);
    say(t('inbox.done.deleted'), { label: t('inbox.done.undo'), onClick: () => restore(item) });
  };

  const onPicked = async (page: PickedPage) => {
    if (!picking) return;
    const { item, mode } = picking;
    setPicking(null);
    setFocusAt(items.indexOf(item));
    if (mode === 'file') {
      const result = await fileItem(item, page);
      if (!result.ok) return say(result.message);
      say(t('inbox.done.filed', { title: page.pageTitle }), {
        label: t('inbox.done.open'),
        onClick: () => router.push(mapWithPageHref(page.projectId, page.pageId)),
      });
    } else {
      const result = await makePage(item, page);
      if (!result.ok) return say(result.message);
      const made = result.pageId;
      say(t('inbox.done.made', { title: result.title }), made ? { label: t('inbox.done.open'), onClick: () => router.push(mapWithPageHref(page.projectId, made)) } : undefined);
    }
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLLIElement>, item: InboxItem, index: number) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.nativeEvent.isComposing) return;
    const onItem = event.target === event.currentTarget;
    const move = (to: number) => {
      event.preventDefault();
      const next = items[to];
      if (next) refs.current.get(next.id)?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(items.length - 1);
    else if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setPicking({ item, mode: 'file' });
    } else if (event.key.toLowerCase() === 'd' || (onItem && event.key === 'Delete')) {
      event.preventDefault();
      remove(item);
    } else if (onItem && event.key === 'Enter' && item.url) {
      event.preventDefault();
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AppFrame
      crumbs={[{ label: t('inbox.title') }]}
      tools={
        <Button leftSection={<IconPlus size={16} />} onClick={openCapture} rightSection={<Kbd size="xs">{keys}</Kbd>}>
          {t('inbox.capture.label')}
        </Button>
      }
    >
      <Stack gap="lg" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={820} w="100%">
        <Stack gap={4}>
          <Title order={1} fz={34} lts={-0.6}>
            {t('inbox.title')}
          </Title>
          <Text c="dimmed">{t('inbox.intro')}</Text>
        </Stack>

        {inbox.status === 'loading' ? (
          <Group gap="xs" role="status">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('inbox.list.loading')}
            </Text>
          </Group>
        ) : inbox.status === 'unavailable' ? (
          <Text c="dimmed" role="alert">
            {t('inbox.errors.unavailable')}
          </Text>
        ) : items.length === 0 ? (
          <Paper withBorder radius="lg" p="xl" className={classes.empty}>
            <Stack align="center" gap="xs" ta="center">
              <IconInbox size={36} stroke={1.4} aria-hidden color="var(--mantine-color-dimmed)" />
              <Title order={2} fz="lg">
                {t('inbox.empty.title')}
              </Title>
              <Text c="dimmed" size="sm" maw={420}>
                {t('inbox.empty.body', { keys })}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <>
            <Text size="xs" c="dimmed">
              {t('inbox.list.keys')}
            </Text>
            <ul className={classes.list} aria-label={t('inbox.list.label')}>
              {items.map((item, index) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  ref={(node) => {
                    if (node) refs.current.set(item.id, node);
                    else refs.current.delete(item.id);
                  }}
                  onKeyDown={(event) => onItemKeyDown(event, item, index)}
                  onFile={() => setPicking({ item, mode: 'file' })}
                  onMakePage={() => setPicking({ item, mode: 'makePage' })}
                  onDelete={() => remove(item)}
                />
              ))}
            </ul>
          </>
        )}
      </Stack>
      <PagePicker
        opened={picking !== null}
        title={picking?.mode === 'makePage' ? t('inbox.picker.makeTitle') : t('inbox.picker.fileTitle')}
        onClose={() => {
          if (picking) setFocusAt(items.indexOf(picking.item));
          setPicking(null);
        }}
        onPick={(page) => void onPicked(page)}
      />
      <Toast message={toast} onDismiss={dismiss} />
    </AppFrame>
  );
}

function InboxRow({
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
        <Button size="compact-sm" variant="light" leftSection={<IconFolderSymlink size={15} />} onClick={onFile} aria-keyshortcuts="F">
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

/** Where an item came from: the site's icon and name, linked, and the video's moment */
function Source({ item }: { item: InboxItem }) {
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
