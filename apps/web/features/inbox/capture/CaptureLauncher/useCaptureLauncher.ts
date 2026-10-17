'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { isCaptureKey, pageOf, pathOf, rememberPath, useOnOpenCapture } from '../keys';

/**
 * The capture launcher's view model: whether quick capture is open, opened by its shortcut (before the editor and
 * the map see the keys) or by openCapture; the page on screen it can add to; and the path last opened, remembered
 */
export function useCaptureLauncher() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
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

  return { state: { opened, page: pageOf(pathname) }, operations: { close: () => setOpened(false) } };
}
