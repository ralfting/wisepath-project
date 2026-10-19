'use client';

import { useRef, useState } from 'react';
import type { Path } from '@wisepath/domain/paths';

/** The public path's view model: the page being read, the main page first */
export function usePublicPath(path: Path) {
  const [selectedId, setSelectedId] = useState<string>(path.rootPageId);
  const articleRef = useRef<HTMLDivElement>(null);
  const page = path.pages.find((p) => p.id === selectedId) ?? path.pages.find((p) => p.id === path.rootPageId)!;

  // A page opened from the pager, or from the list under the text on a phone, is read from its top
  const open = (pageId: string) => {
    setSelectedId(pageId);
    const article = articleRef.current;
    if (!article) return;
    const { top } = article.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight) article.scrollIntoView({ block: 'start' });
  };

  return { state: { page }, refs: { article: articleRef }, operations: { open } };
}
