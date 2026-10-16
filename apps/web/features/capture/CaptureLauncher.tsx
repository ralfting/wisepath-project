'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { QuickCapture } from './QuickCapture';
import { Toast } from './Toast';
import type { ToastMessage } from './Toast';
import { isCaptureKey, pageOf, pathOf, rememberPath, useOnOpenCapture } from './keys';

/**
 * CaptureLauncher
 * Opens quick capture from ⌘⇧Space (Ctrl+Shift+Space) anywhere in the app, even
 * while typing in a page, and says what happened to what was captured. It also
 * remembers the path last opened, which the Inbox's pickers offer first.
 */
export function CaptureLauncher() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const page = pageOf(pathname);
  const open = useCallback(() => setOpened(true), []);

  useOnOpenCapture(open);

  // Listened for before the editor and the map see the keys, so they can't keep it
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCaptureKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpened(true);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    const pathId = pathOf(pathname);
    if (pathId) rememberPath(pathId);
  }, [pathname]);

  const dismiss = useCallback(() => setToast(null), []);

  return (
    <>
      <QuickCapture
        opened={opened}
        onClose={() => setOpened(false)}
        page={page}
        onDone={(text) => setToast({ text, key: Date.now() })}
      />
      <Toast message={toast} onDismiss={dismiss} />
    </>
  );
}
