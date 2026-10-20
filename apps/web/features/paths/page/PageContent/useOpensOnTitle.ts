'use client';

import { useRef } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { mayEditPage } from '@wisepath/domain/paths';
import { awaitsName } from '@/i18n/title';

/**
 * Whether the page opens on its title: one made without a name, nothing written in it yet, for someone who may
 * rename it. Decided as the page opens, so emptying its text later doesn't pull the cursor up to the title
 */
export function useOpensOnTitle(path: Path, page: Page): boolean {
  const opened = useRef<{ id: string; onTitle: boolean } | null>(null);
  if (opened.current?.id !== page.id) {
    opened.current = { id: page.id, onTitle: mayEditPage(path, page.id, { title: page.title }) && awaitsName(page) };
  }
  return opened.current.onTitle;
}
