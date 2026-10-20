'use client';

import { useRef, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { Path } from '@wisepath/domain/paths';
import type { FocusRequest, View } from '@/features/paths/map';

/**
 * The public path's view model: the map or the list, the page being read (the main page first), whether it is open
 * in the drawer over the map, and whether the screen has room for the map
 */
export function usePublicPath(path: Path) {
  const [view, setView] = useState<View>('map');
  const [selectedId, setSelectedId] = useState<string>(path.rootPageId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const theme = useMantineTheme();
  // Known only after the first render, so it matches the server's, which draws no map; CSS picks the view meanwhile
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);
  const articleRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const page = path.pages.find((p) => p.id === selectedId) ?? path.pages.find((p) => p.id === path.rootPageId)!;
  const reading = view === 'map' && wide && drawerOpen;

  // A page opened from the pager, or the list under the text on a phone, is read from its top
  const open = (pageId: string) => {
    setSelectedId(pageId);
    const article = articleRef.current;
    if (!article) return;
    const { top } = article.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight) article.scrollIntoView({ block: 'start' });
  };

  return {
    state: { view, page, wide, reading, focusRequest },
    refs: { article: articleRef, drawer: drawerRef },
    operations: {
      setView,
      open,
      // Another page in the open drawer is read from its top too, and the map brings it out from under the drawer
      openInDrawer: (pageId: string) => {
        setSelectedId(pageId);
        setDrawerOpen(true);
        setFocusRequest((request) => ({ pageId, nonce: (request?.nonce ?? 0) + 1 }));
        drawerRef.current?.scrollTo({ top: 0 });
      },
      closeDrawer: () => setDrawerOpen(false),
    },
  };
}
