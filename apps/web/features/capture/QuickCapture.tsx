'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { ActionIcon, Group, Image, Loader, SegmentedControl, Text, Textarea, Tooltip } from '@mantine/core';
import { IconLink, IconX } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import { useLinkPreviewLoader, usePath } from '@/useCases/paths';
import { useCapture, useFileItem } from '@/useCases/inbox';
import type { CaptureInput, PageTarget } from '@/useCases/inbox';
import { displayTitle } from '@/features/shared/title';
import { CaptureBox } from './CaptureBox';
import { useModEnter } from './keys';
import { isVideo, pastedAddress, startOf } from './pasted';
import classes from './QuickCapture.module.css';

/**
 * QuickCapture
 * One field to write something down without choosing where it goes: Enter
 * saves it to the Inbox and closes, Shift+Enter starts a new line, Esc closes
 * without saving. A pasted address is kept with its title, and a YouTube
 * address with a time (?t=) with that moment. Opened over a page, it can add
 * to that page straight away instead.
 */

interface Link {
  readonly url: string;
  readonly title?: string;
  readonly favicon?: string | null;
  readonly videoTime?: number;
  readonly loading: boolean;
}

export function QuickCapture({
  opened,
  onClose,
  page,
  onDone,
}: {
  opened: boolean;
  onClose: () => void;
  /** The page on screen, which can take the text straight away */
  page: PageTarget | null;
  /** Says what happened, once it did */
  onDone: (message: string) => void;
}) {
  const t = useT();
  const capture = useCapture();
  const fileItem = useFileItem();
  const loadPreview = useLinkPreviewLoader();
  const modEnter = useModEnter();
  const [text, setText] = useState('');
  const [link, setLink] = useState<Link | null>(null);
  const [toPage, setToPage] = useState(false);
  const pageTitle = useRef('');
  const rememberTitle = useCallback((title: string) => {
    pageTitle.current = title;
  }, []);

  // Every opening starts blank, headed for the Inbox
  useEffect(() => {
    if (!opened) return;
    setText('');
    setLink(null);
    setToPage(false);
  }, [opened]);

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const url = pastedAddress(event.clipboardData.getData('text'));
    if (!url || link) return;
    const videoTime = isVideo(url) ? startOf(url) : undefined;
    setLink({ url, loading: true, ...(videoTime !== undefined ? { videoTime } : {}) });
    void loadPreview(url).then((preview) =>
      setLink((current) =>
        current?.url === url ? { ...current, loading: false, title: preview?.title ?? undefined, favicon: preview?.favicon ?? null } : current,
      ),
    );
  };

  const save = (straightToPage: boolean) => {
    const value = text.trim();
    if (!value) return;
    // The address goes with the text only while the text still has it
    const kept = link && value.includes(link.url) ? link : null;
    const input: CaptureInput = {
      text: value,
      ...(kept ? { url: kept.url, ...(kept.title ? { title: kept.title } : {}), ...(kept.videoTime !== undefined ? { videoTime: kept.videoTime } : {}) } : {}),
    };
    onClose();
    if (straightToPage && page) {
      void fileItem(input, page).then((result) =>
        onDone(result.ok ? t('inbox.capture.added', { title: displayTitle({ title: result.title || pageTitle.current }) }) : result.message),
      );
    } else {
      capture(input);
      onDone(t('inbox.capture.saved'));
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    save(!!page && (toPage || event.metaKey || event.ctrlKey));
  };

  const shown = link && text.includes(link.url) ? link : null;

  return (
    <CaptureBox opened={opened} onClose={onClose} label={t('inbox.capture.label')} footer={page ? t('inbox.capture.hintOnPage', { keys: modEnter }) : t('inbox.capture.hint')}>
      <Textarea
        aria-label={t('inbox.capture.field')}
        placeholder={t('inbox.capture.placeholder')}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        autosize
        minRows={2}
        maxRows={10}
        variant="unstyled"
        size="md"
        data-autofocus
        classNames={{ input: classes.field }}
      />
      {shown && (
        <Group gap={8} wrap="nowrap" className={classes.link}>
          {shown.loading ? (
            <Loader size={14} aria-label={t('inbox.capture.link.loading')} />
          ) : shown.favicon ? (
            <Image src={shown.favicon} alt="" w={16} h={16} />
          ) : (
            <IconLink size={16} aria-hidden />
          )}
          <Text size="sm" truncate style={{ flex: 1 }}>
            {shown.title ?? shown.url}
            {shown.videoTime !== undefined && (
              <Text span size="sm" c="dimmed">
                {' '}
                {t('inbox.capture.link.at', { time: formatTime(shown.videoTime) })}
              </Text>
            )}
          </Text>
          <Tooltip label={t('inbox.capture.link.remove')}>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('inbox.capture.link.remove')} onClick={() => setLink(null)}>
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      {page && <Destination page={page} toPage={toPage} onChange={setToPage} onTitle={rememberTitle} />}
    </CaptureBox>
  );
}

/** Inbox or the page on screen; the page's title comes from its map, already open */
function Destination({
  page,
  toPage,
  onChange,
  onTitle,
}: {
  page: PageTarget;
  toPage: boolean;
  onChange: (toPage: boolean) => void;
  onTitle: (title: string) => void;
}) {
  const t = useT();
  const { state } = usePath(page.pathId);
  const found = state.status === 'ready' ? state.path.pages.find((p) => p.id === page.pageId) : undefined;
  const title = found ? displayTitle(found) : '';
  useEffect(() => {
    onTitle(title);
  }, [title, onTitle]);
  if (!found) return null;
  return (
    <Group className={classes.destination} gap="sm" wrap="nowrap">
      <Text size="xs" c="dimmed" id="capture-destination">
        {t('inbox.capture.destination')}
      </Text>
      <SegmentedControl
        size="xs"
        radius="md"
        aria-labelledby="capture-destination"
        value={toPage ? 'page' : 'inbox'}
        onChange={(value) => onChange(value === 'page')}
        data={[
          { value: 'inbox', label: t('inbox.capture.toInbox') },
          { value: 'page', label: <span className={classes.pageChoice}>{t('inbox.capture.toPage', { title })}</span> },
        ]}
      />
    </Group>
  );
}
