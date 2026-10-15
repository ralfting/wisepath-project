'use client';

import { useEffect, useState } from 'react';

/**
 * Keys
 * The capture shortcut, ⌘⇧Space (Ctrl+Shift+Space off a Mac), and how the
 * rest of the app asks for the capture box without a shortcut.
 */

const OPEN_EVENT = 'wisepath:capture';

/** True for the capture shortcut */
export const isCaptureKey = (event: KeyboardEvent) =>
  event.code === 'Space' && event.shiftKey && (event.metaKey || event.ctrlKey) && !event.altKey;

/** Opens the capture box from a button or a menu */
export const openCapture = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Runs when something asks for the capture box */
export function useOnOpenCapture(open: () => void) {
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [open]);
}

/** The shortcut as this computer writes it; the Mac's until the browser says otherwise, so the server render matches */
export function useCaptureKeys(): string {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return mac ? '⌘⇧Space' : 'Ctrl+Shift+Space';
}

/** ⌘Enter, or Ctrl+Enter off a Mac */
export function useModEnter(): string {
  const keys = useCaptureKeys();
  return keys.startsWith('⌘') ? '⌘Enter' : 'Ctrl+Enter';
}

const LAST_PATH_KEY = 'wisepath:last-path';

/** The path last opened on this device, which pickers offer first; storage can be unavailable */
export function lastPathId(): string | null {
  try {
    return localStorage.getItem(LAST_PATH_KEY);
  } catch {
    return null;
  }
}

export function rememberPath(projectId: string) {
  try {
    localStorage.setItem(LAST_PATH_KEY, projectId);
  } catch {
    // Pickers start from the first path instead
  }
}

/** The map and page a URL shows, when it shows a page (in the drawer or full) */
export function pageOf(pathname: string): { projectId: string; pageId: string } | null {
  const match = pathname.match(/^\/projects\/([^/]+)\/pages\/([^/]+)/);
  return match ? { projectId: decodeURIComponent(match[1]), pageId: decodeURIComponent(match[2]) } : null;
}

/** The map a URL is in, if any */
export function pathOf(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
