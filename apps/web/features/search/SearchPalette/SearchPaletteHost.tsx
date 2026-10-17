'use client';

import { useEffect, useState } from 'react';
import { SearchPalette } from './SearchPalette';
import { OPEN_SEARCH_PALETTE_EVENT, isSearchShortcut } from './SearchPalette.helpers';

/** The palette, opened by ⌘P from anywhere (fields and the editor included) or by openSearchPalette */
export function SearchPaletteHost() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    // Capture: the editor and the browser's print dialog must not see it first
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpened((open) => !open);
    };
    const onOpen = () => setOpened(true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    };
  }, []);

  return <SearchPalette opened={opened} onClose={() => setOpened(false)} />;
}
