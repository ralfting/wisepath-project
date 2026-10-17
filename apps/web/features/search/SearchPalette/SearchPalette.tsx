'use client';

import { Palette } from '@/ui/Palette/Palette';
import { useT } from '@/i18n/I18nProvider';
import { SearchPanel } from './SearchPanel/SearchPanel';
import { OPEN_SEARCH_PALETTE_EVENT } from './SearchPalette.helpers';

/**
 * Search everywhere
 * ⌘P (Ctrl P) anywhere in the app opens a palette in the middle of the
 * screen. Empty, it offers the pages opened most recently; typing searches
 * every path, by title and then by text. ↑ ↓ move, Enter opens the page on
 * its map (in the drawer), ⌘Enter as a full page, Esc closes.
 *
 * SearchPanel is the palette's content on its own (the field and the list),
 * so a palette shell shared with other modes can host it; SearchPalette puts
 * it in a centred card that holds the focus; SearchPaletteHost owns the
 * shortcut and is mounted once, by the app frame.
 */

export function openSearchPalette(): void {
  window.dispatchEvent(new Event(OPEN_SEARCH_PALETTE_EVENT));
}

/**
 * The search in the app's palette (the same card as quick capture's): the focus stays inside until it closes,
 * then goes back where it was
 */
export function SearchPalette({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Palette opened={opened} onClose={onClose} label={t('search.palette.label')}>
      <SearchPanel onDone={onClose} />
    </Palette>
  );
}
