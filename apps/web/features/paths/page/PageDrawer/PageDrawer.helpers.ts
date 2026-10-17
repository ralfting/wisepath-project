'use client';

import { createContext } from 'react';

export const DRAWER_WIDTH = 560;

export const DrawerContext = createContext<DrawerControls>({
  close: () => {},
  expanded: false,
  toggleExpanded: () => {},
  trail: { before: [], at: null },
  setTrail: () => {},
  cursors: new Map(),
  shown: { current: null },
});

/**
 * Where the drawer has been: going from page to page inside it adds the page
 * left behind, so the back arrow can return to it. A page opened some other
 * way (a click on the map) is not where the trail ends, so it starts over.
 */
export interface Trail {
  before: ReadonlyArray<string>;
  at: string | null;
}

/** What Tab stops on */
export const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex], [contenteditable=true]';

/** Matches the leave animation in PageDrawer.module.css */
export const LEAVE_MS = 180;

/** Gap between the floating drawer and the window's edges */
export const DRAWER_GAP = 12;

/** Closes the drawer with its exit animation, then leaves its URL */
export interface DrawerControls {
  close: () => void;
  /** Grown to the whole window, in place: no navigation, no reload */
  expanded: boolean;
  toggleExpanded: () => void;
  /** The pages walked through inside the drawer, ending at the one it shows now */
  trail: Trail;
  setTrail: (trail: Trail) => void;
  /** Where the cursor last was in each page's text, to put it back on return */
  cursors: Map<string, number>;
  /** The page the drawer showed last: the route remounts the page for each one, the drawer stays */
  shown: { current: string | null };
}

/**
 * Whether the page is being opened from the keyboard: the control that opened it (a map node, the
 * Continue button) still has the focus, and shows it, as the browser does only for keys
 */
export function openedByKeyboard(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return !!active && active !== document.body && !active.closest('.mantine-Drawer-content') && active.matches(':focus-visible');
}
