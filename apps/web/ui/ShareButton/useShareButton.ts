'use client';

import { useClipboard } from '@mantine/hooks';

/** Sharing an address: a phone's own share sheet (messages, apps), or the link copied everywhere else */
export function useShareButton(href: string, title: string) {
  const clipboard = useClipboard();

  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    // A desktop browser may offer a share sheet too, but there copying the link is what people expect
    const phone = window.matchMedia('(pointer: coarse)').matches;
    if (!phone || !navigator.share) return clipboard.copy(url);
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // Closing the sheet is a choice, not a failure; anything else falls back to the copy
      if (!(error instanceof DOMException && error.name === 'AbortError')) clipboard.copy(url);
    }
  };

  return { state: { copied: clipboard.copied }, operations: { share } };
}
