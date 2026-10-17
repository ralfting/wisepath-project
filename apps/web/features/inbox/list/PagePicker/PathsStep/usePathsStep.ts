'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { PathSummary } from '@wisepath/domain/paths';
import { usePaths } from '@/useCases/paths';
import { lastPathId } from '@/features/inbox/capture';
import { paletteFieldProps, usePaletteId, usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { caretAt, pathsFor } from '../PagePicker.helpers';

/** The paths step's view model: the search, the paths matching it (the last one opened first), and its keys */
export function usePathsStep({ onPick, marked }: { onPick: (path: PathSummary) => void; marked: string | null }) {
  const paths = usePaths();
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  // The step's field takes the focus as the step appears (Enter from the other step)
  const field = useFocusOnMount<HTMLInputElement>();
  const last = useMemo(() => lastPathId(), []);
  const items = useMemo(() => pathsFor(paths ?? [], last, query), [paths, last, query]);
  const keys = usePaletteKeys(items, onPick, Math.max(0, items.findIndex((p) => p.id === marked)));

  // → at the end of the search goes into the path under the cursor
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const path = items[keys.active];
    if (event.key === 'ArrowRight' && path && caretAt(event.currentTarget, 'end')) {
      event.preventDefault();
      onPick(path);
      return;
    }
    keys.onKeyDown(event);
  };

  return {
    field,
    state: { query, items, loading: paths === null, last, listId, active: keys.active, fieldProps: paletteFieldProps(listId, keys.active, items.length) },
    operations: { setQuery, keyDown, setActive: keys.setActive, pick: onPick },
  };
}

