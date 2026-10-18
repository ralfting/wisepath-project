'use client';

import { useState } from 'react';
import type { Path } from '@wisepath/domain/paths';

/** The public path's view model: the page being read, the main page first */
export function usePublicPath(path: Path) {
  const [selectedId, setSelectedId] = useState<string>(path.rootPageId);
  const page = path.pages.find((p) => p.id === selectedId) ?? path.pages.find((p) => p.id === path.rootPageId)!;
  return { state: { page }, operations: { select: setSelectedId } };
}
