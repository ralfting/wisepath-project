'use client';

import type { Page, Path } from '@wisepath/domain/paths';
import { useRememberOpened } from '@/useCases/search';

/** Offered again by the search palette (⌘P), like a page opened in the map's drawer */
export function RememberOpened({ path, page }: { path: Path; page: Page }) {
  useRememberOpened({ pathId: path.id, pageId: page.id, title: page.title, pathTitle: path.title });
  return null;
}
