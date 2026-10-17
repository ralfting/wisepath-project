'use client';

import { useState } from 'react';
import type { Path } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { showToast } from '@/features/inbox/capture';

/**
 * Adding a page branching from another (the + on a page, or N): the page it branches from, the name field that stays
 * open for the next one, and saying what was added (with Undo)
 */
export function useBranch({
  path,
  actions,
  select,
  bringIntoView,
}: {
  path: Path;
  actions: PathActions;
  select: (pageId: string, fresh?: boolean) => void;
  bringIntoView: (pageId: string) => void;
}) {
  const t = useT();
  const [from, setFrom] = useState<string | null>(null);

  const close = (refocus: boolean) => {
    const was = from;
    setFrom(null);
    // Back to the page it was adding to, so the keyboard goes on from there
    if (refocus && was) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-page-id="${was}"]`)?.focus({ preventScroll: true }));
  };

  const add = (parentId: string, title: string, stay: boolean) => {
    const parent = path.pages.find((p) => p.id === parentId);
    const added = actions.addBranch(parentId, title);
    if (!parent || !added) return;
    const names = { title: displayTitle(added.page), parent: displayTitle(parent) };
    showToast({
      text: added.created ? t('map.branch.added', names) : t('map.branch.linked', names),
      action: { label: t('map.branch.undo'), onClick: added.undo },
    });
    if (stay) bringIntoView(parentId);
    else {
      setFrom(null);
      select(added.page.id, added.created);
    }
  };

  return { state: { from, parent: from ? path.pages.find((p) => p.id === from) : undefined }, operations: { start: setFrom, close, add } };
}
