'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import { useDiscard, useFileItem, useInbox, useMakePage } from '@/useCases/inbox';
import { showToast, useCaptureKeys } from '@/features/inbox/capture';
import type { ToastMessage } from '@/features/inbox/capture';
import { mapWithPageHref } from '@/shared/routes';
import type { PickedPage } from '../PagePicker/PagePicker.helpers';

/** The item a page is being picked for, and what will be done with it */
type Picking = { readonly item: InboxItem; readonly mode: 'file' | 'makePage' } | null;

/**
 * The Inbox page's view model: the items, the page picker for one of them (to add it to a page or make it one),
 * deleting with Undo, and the keys on each item. After an item leaves, the keyboard goes to its neighbour.
 */
export function useInboxPage() {
  const t = useT();
  const router = useRouter();
  const inbox = useInbox();
  const { discard, restore } = useDiscard();
  const fileItem = useFileItem();
  const makePage = useMakePage();
  const captureKeys = useCaptureKeys();
  const [picking, setPicking] = useState<Picking>(null);
  const items = useMemo(() => (inbox.status === 'ready' ? inbox.items : []), [inbox]);

  // Which item has the keyboard; after one leaves, its neighbour takes it
  const rows = useRef(new Map<string, HTMLLIElement>());
  const [focusAt, setFocusAt] = useState<number | null>(null);
  useEffect(() => {
    if (focusAt === null || picking) return;
    const item = items[Math.min(focusAt, items.length - 1)];
    if (item) rows.current.get(item.id)?.focus();
    setFocusAt(null);
  }, [focusAt, items, picking]);

  const say = (text: string, action?: ToastMessage['action']) => showToast({ text, ...(action ? { action } : {}) });

  const remove = (item: InboxItem) => {
    setFocusAt(items.indexOf(item));
    discard(item);
    say(t('inbox.done.deleted'), { label: t('inbox.done.undo'), onClick: () => restore(item) });
  };

  const pick = async (page: PickedPage) => {
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

  const closePicker = () => {
    if (picking) setFocusAt(items.indexOf(picking.item));
    setPicking(null);
  };

  const keyDown = (event: KeyboardEvent<HTMLLIElement>, item: InboxItem, index: number) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.nativeEvent.isComposing) return;
    const onItem = event.target === event.currentTarget;
    const move = (to: number) => {
      event.preventDefault();
      const next = items[to];
      if (next) rows.current.get(next.id)?.focus();
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

  /** Keeps each row's element, so the keys can move the focus between them */
  const rowRef = (item: InboxItem) => (node: HTMLLIElement | null) => {
    if (node) rows.current.set(item.id, node);
    else rows.current.delete(item.id);
  };

  return {
    state: { status: inbox.status, items, picking: picking?.mode ?? null, captureKeys },
    operations: {
      rowRef,
      keyDown,
      file: (item: InboxItem) => setPicking({ item, mode: 'file' }),
      makePage: (item: InboxItem) => setPicking({ item, mode: 'makePage' }),
      remove,
      pick: (page: PickedPage) => void pick(page),
      closePicker,
    },
  };
}
