import { useCallback, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * The keys of a palette's list, for the field above it: ↑ ↓ move through the
 * choices (wrapping around), Enter picks the one highlighted. The highlight
 * goes back to the first choice whenever the choices change.
 */
export function usePaletteKeys<T>(items: ReadonlyArray<T>, onPick: (item: T) => void, initial = 0) {
  const [active, setActive] = useState(initial);
  // Back to the first whenever the list changes after it shows (a search typed), not as it first shows
  const [shown, setShown] = useState(items);
  if (shown !== items) {
    setShown(items);
    setActive(0);
  }
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (items.length === 0) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + items.length) % items.length);
      } else if (event.key === 'Enter' && !event.shiftKey) {
        const item = items[Math.min(active, items.length - 1)];
        if (item === undefined) return;
        event.preventDefault();
        onPick(item);
      }
    },
    [items, active, onPick],
  );
  return { active: Math.min(active, Math.max(items.length - 1, 0)), setActive, onKeyDown };
}

/** The props a palette's field needs to announce its list: spread them on the input */
export function paletteFieldProps(listId: string, active: number, count: number) {
  return {
    role: 'combobox',
    // With nothing to choose the list isn't there, so the field points at nothing
    'aria-expanded': count > 0,
    'aria-controls': count > 0 ? listId : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant': count > 0 ? `${listId}-${active}` : undefined,
  };
}

/** A stable id for a palette's list */
export const usePaletteId = () => `palette-${useId().replace(/:/g, '')}`;
