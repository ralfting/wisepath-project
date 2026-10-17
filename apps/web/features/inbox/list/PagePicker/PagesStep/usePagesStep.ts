'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Page, PathSummary } from '@wisepath/domain/paths';
import { usePath } from '@/useCases/paths';
import { displayTitle } from '@/i18n/title';
import { paletteFieldProps, usePaletteId, usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { caretAt, pagesFor } from '../PagePicker.helpers';
import type { PickedPage } from '../PagePicker.helpers';

/** The pages step's view model: the chosen path's pages matching the search (its main page first), and its keys */
export function usePagesStep({ path, onBack, onPick }: { path: PathSummary; onBack: () => void; onPick: (page: PickedPage) => void }) {
  const { state: loaded } = usePath(path.id);
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  // The step's field takes the focus as the step appears (Enter from the other step)
  const field = useFocusOnMount<HTMLInputElement>();
  const items = useMemo(() => (loaded.status === 'ready' ? pagesFor(loaded.path, query) : []), [loaded, query]);
  const pick = (page: Page) => onPick({ pathId: path.id, pageId: page.id, pageTitle: displayTitle(page) });
  const keys = usePaletteKeys(items, pick);

  // Backspace on an empty search, or ← at its start, goes back to the paths
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Backspace' && query === '') || (event.key === 'ArrowLeft' && caretAt(event.currentTarget, 'start'))) {
      event.preventDefault();
      onBack();
      return;
    }
    keys.onKeyDown(event);
  };

  return {
    field,
    state: { query, items, status: loaded.status, listId, active: keys.active, fieldProps: paletteFieldProps(listId, keys.active, items.length) },
    operations: { setQuery, keyDown, setActive: keys.setActive, pick, back: onBack },
  };
}

