'use client';

import { useEffect, useState } from 'react';

/** True on a Mac, iPhone or iPad, where shortcuts use ⌘ rather than Ctrl; false where there is no browser */
export const isMacPlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** isMacPlatform for rendering: the Mac's keys until the browser says otherwise, so the server render matches */
export function useIsMac(): boolean {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(isMacPlatform()), []);
  return mac;
}
