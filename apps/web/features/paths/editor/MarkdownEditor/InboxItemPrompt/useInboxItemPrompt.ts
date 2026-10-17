'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { InboxItem } from '@wisepath/domain/inbox';
import { paletteFieldProps, usePaletteId, usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import { inboxMatches } from './InboxItemPrompt.helpers';

/** The Inbox prompt's view model: the search, the items matching it, and its keys (Esc and clicking away cancel) */
export function useInboxItemPrompt({
  items,
  onCancel,
  onPick,
}: {
  items: ReadonlyArray<InboxItem> | null;
  onCancel: () => void;
  onPick: (item: InboxItem) => void;
}) {
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const found = useMemo(() => inboxMatches(items ?? [], query), [items, query]);
  const keys = usePaletteKeys(found, onPick);

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    keys.onKeyDown(event);
  };
  // Clicking elsewhere on the page cancels; switching to another window does not
  const blur = () => {
    if (document.hasFocus()) onCancel();
  };

  return {
    state: { query, found, listId, active: keys.active, fieldProps: paletteFieldProps(listId, keys.active, found.length) },
    operations: { setQuery, keyDown, blur, setActive: keys.setActive, pick: onPick },
  };
}
