'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Group, Kbd, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconInbox, IconPlus } from '@tabler/icons-react';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import { useDiscard, useFileItem, useInbox, useMakePage } from '@/useCases/inbox';
import { AppFrame } from '@/features/shell';
import { openCapture, showToast, useCaptureKeys } from '@/features/inbox/capture';
import type { ToastMessage } from '@/features/inbox/capture';
import { mapWithPageHref } from '@/shared/routes';
import { PagePicker } from '../PagePicker/PagePicker';
import type { PickedPage } from '../PagePicker/PagePicker.helpers';
import classes from './InboxPage.module.css';
import { InboxRow } from './InboxRow';

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

  const say = (text: string, action?: ToastMessage['action']) => showToast({ text, ...(action ? { action } : {}) });

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
        onClick: () => router.push(mapWithPageHref(page.pathId, page.pageId)),
      });
    } else {
      const result = await makePage(item, page);
      if (!result.ok) return say(result.message);
      const made = result.pageId;
      say(t('inbox.done.made', { title: result.title }), made ? { label: t('inbox.done.open'), onClick: () => router.push(mapWithPageHref(page.pathId, made)) } : undefined);
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
    </AppFrame>
  );
}
