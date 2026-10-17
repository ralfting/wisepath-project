import { createContext } from 'react';
import type { DrawerControls } from './PageDrawer';

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

/** Matches the leave animation in PagePanel.module.css */
export const LEAVE_MS = 180;
