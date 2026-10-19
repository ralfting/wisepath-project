'use client';

import { useRef, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { Path } from '@wisepath/domain/paths';

/** The public path's view model: the page being read, the main page first, and whether the screen has room for the map */
export function usePublicPath(path: Path) {
  const [selectedId, setSelectedId] = useState<string>(path.rootPageId);
  const theme = useMantineTheme();
  // Known only after the first render, so it matches the server's, which draws no map; the card keeps its space meanwhile
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);
  const articleRef = useRef<HTMLDivElement>(null);
  const page = path.pages.find((p) => p.id === selectedId) ?? path.pages.find((p) => p.id === path.rootPageId)!;

  // A page opened from the pager, the map, or the list under the text on a phone, is read from its top
  const open = (pageId: string) => {
    setSelectedId(pageId);
    const article = articleRef.current;
    if (!article) return;
    const { top } = article.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight) article.scrollIntoView({ block: 'start' });
  };

  return { state: { page, wide }, refs: { article: articleRef }, operations: { open } };
}
