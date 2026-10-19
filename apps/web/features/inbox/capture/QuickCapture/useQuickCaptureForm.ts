'use client';

import { useCallback, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { useLinkPreviewLoader } from '@/useCases/paths';
import type { CaptureInput, PageTarget, useCapture, useFileItem } from '@/useCases/inbox';
import { displayTitle } from '@/i18n/title';
import { useHasKeyboard } from '@/ui/platform';
import { isVideo, pastedAddress, startOf } from '../pasted';

/** A pasted address kept with the text: its title and icon once fetched, and the video's moment */
export interface Link {
  readonly url: string;
  readonly title?: string;
  readonly favicon?: string | null;
  readonly videoTime?: number;
  readonly loading: boolean;
}

/** Saving what was captured: to the Inbox, or straight to a page */
export interface CaptureSavers {
  readonly capture: ReturnType<typeof useCapture>;
  readonly fileItem: ReturnType<typeof useFileItem>;
}

/**
 * Quick capture's view model: the text, a pasted address with its preview, whether it goes to the page on screen,
 * and saving it to the Inbox or to that page, on Enter or, where there is no keyboard, from its button. It starts
 * blank on every opening, since the palette mounts it then. The savers come from outside: saving goes on after the
 * form has closed, so they must live in something that stays.
 */
export function useQuickCaptureForm({
  page,
  savers,
  onClose,
  onDone,
}: {
  page: PageTarget | null;
  savers: CaptureSavers;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useT();
  const { capture, fileItem } = savers;
  const loadPreview = useLinkPreviewLoader();
  const hasKeyboard = useHasKeyboard();
  const [text, setText] = useState('');
  const [link, setLink] = useState<Link | null>(null);
  const [toPage, setToPage] = useState(false);
  const pageTitle = useRef('');
  const rememberTitle = useCallback((title: string) => {
    pageTitle.current = title;
  }, []);

  const paste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
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
      void fileItem(input, page).then((result) => {
        // What the page couldn't take goes to the Inbox, as the message says, instead of being lost
        if (!result.ok) capture(input);
        onDone(result.ok ? t('inbox.capture.added', { title: displayTitle({ title: result.title || pageTitle.current }) }) : result.message);
      });
    } else {
      capture(input);
      onDone(t('inbox.capture.saved'));
    }
  };

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // A phone's keyboard has no Shift+Enter, so there Enter starts a new line and the Save button saves
    if (!hasKeyboard || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    save(!!page && (toPage || event.metaKey || event.ctrlKey));
  };

  return {
    state: { text, toPage, shownLink: link && text.includes(link.url) ? link : null, hasKeyboard },
    operations: { setText, paste, keyDown, submit: () => save(!!page && toPage), removeLink: () => setLink(null), setToPage, rememberTitle },
  };
}
