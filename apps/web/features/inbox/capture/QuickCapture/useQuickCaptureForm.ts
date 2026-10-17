'use client';

import { useCallback, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { useLinkPreviewLoader } from '@/useCases/paths';
import { useCapture, useFileItem } from '@/useCases/inbox';
import type { CaptureInput, PageTarget } from '@/useCases/inbox';
import { displayTitle } from '@/i18n/title';
import { isVideo, pastedAddress, startOf } from '../pasted';

/** A pasted address kept with the text: its title and icon once fetched, and the video's moment */
export interface Link {
  readonly url: string;
  readonly title?: string;
  readonly favicon?: string | null;
  readonly videoTime?: number;
  readonly loading: boolean;
}

/**
 * Quick capture's view model: the text, a pasted address with its preview, whether it goes to the page on screen,
 * and saving it to the Inbox or to that page. It starts blank on every opening, since the palette mounts it then.
 */
export function useQuickCaptureForm({ page, onClose, onDone }: { page: PageTarget | null; onClose: () => void; onDone: (message: string) => void }) {
  const t = useT();
  const capture = useCapture();
  const fileItem = useFileItem();
  const loadPreview = useLinkPreviewLoader();
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
      void fileItem(input, page).then((result) =>
        onDone(result.ok ? t('inbox.capture.added', { title: displayTitle({ title: result.title || pageTitle.current }) }) : result.message),
      );
    } else {
      capture(input);
      onDone(t('inbox.capture.saved'));
    }
  };

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    save(!!page && (toPage || event.metaKey || event.ctrlKey));
  };

  return {
    state: { text, toPage, shownLink: link && text.includes(link.url) ? link : null },
    operations: { setText, paste, keyDown, removeLink: () => setLink(null), setToPage, rememberTitle },
  };
}
