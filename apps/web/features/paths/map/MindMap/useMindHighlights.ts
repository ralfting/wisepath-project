'use client';

import { useEffect, useState } from 'react';
import { useWindowEvent } from '@mantine/hooks';
import { RELATED_HOVER_EVENT, relatedFromEvent } from '@/features/paths/path';

/**
 * What the mind map singles out: pages the search left out (dimmed), the result marked in its list (picked, the
 * others it found stepping back), the related page pointed at in the drawer, and which links across the map show,
 * from or to the open page or the one under the pointer
 */
export function useMindHighlights({
  selectedId,
  matchIds,
  searchActiveId,
  onIntent,
}: {
  selectedId: string | null;
  matchIds: ReadonlySet<string> | null;
  searchActiveId: string | null;
  onIntent?: (pageId: string) => void;
}) {
  const dimmed = (id: string) => matchIds !== null && !matchIds.has(id);
  // The result marked in the search's list (else the page opened from it) stands out from the others it found,
  // which step back a little
  const picked = matchIds === null ? null : searchActiveId ?? (selectedId !== null && matchIds.has(selectedId) ? selectedId : null);
  // A page pointed at in the drawer's Related list: its connection to the open page is singled out
  const [relatedId, setRelatedId] = useState<string | null>(null);
  useWindowEvent(RELATED_HOVER_EVENT, (event) => setRelatedId(relatedFromEvent(event)));
  useEffect(() => setRelatedId(null), [selectedId]);
  const pointed = relatedId !== null && selectedId !== null ? relatedId : null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const touchesSelection = (from: string, to: string) => selectedId !== null && (from === selectedId || to === selectedId);
  /** The line between the open page and the related one pointed at, either way */
  const isPointedLink = (from: string, to: string) =>
    pointed !== null && ((from === selectedId && to === pointed) || (from === pointed && to === selectedId));
  // Links across the map stay faint until they matter: from or to the open page, or the one under the pointer.
  // While a related page is pointed at, only its link does
  const arrowActive = (from: string, to: string) =>
    pointed !== null ? isPointedLink(from, to) : touchesSelection(from, to) || (hoveredId !== null && (from === hoveredId || to === hoveredId));

  return {
    dimmed,
    isPointedLink,
    arrowActive,
    /** The data attributes that mark a page for the search and the drawer's Related list */
    markOf: (id: string) => ({
      'data-picked': picked === id || undefined,
      'data-receded': (picked !== null && picked !== id && !dimmed(id)) || undefined,
      'data-related': pointed === id || undefined,
    }),
    /** The pointer rests on a page: its links show, and it is a good moment to load it */
    point: (pageId: string) => {
      setHoveredId(pageId);
      onIntent?.(pageId);
    },
    leave: () => setHoveredId(null),
  };
}
