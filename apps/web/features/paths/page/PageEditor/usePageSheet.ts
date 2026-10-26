'use client';

import { useState } from 'react';
import { trailTo } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { pageActionsFor } from '../PageContent/PageContent.helpers';

/** The full page's tabs: the page's text, or the reader's own notes on it */
export type SheetTab = 'content' | 'notes';

/** The full page's view model: the pages between it and the root, its delete dialog, its tab, and Enter in the title moving to the text */
export function usePageSheet({ path, page, store, onOpenPage }: { path: Path; page: Page; store: PathActions; onOpenPage: (pageId: string, alternate?: boolean) => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [tab, setTab] = useState<SheetTab>('content');
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  return {
    state: {
      isRoot: page.id === path.rootPageId,
      between: trailTo(path, page.id).slice(1, -1),
      actions: pageActionsFor(store, onOpenPage),
      confirmingDelete,
      tab,
      textFocus,
    },
    operations: {
      showTab: setTab,
      // From the title: to the text, on its tab
      focusText: () => {
        setTab('content');
        setTextFocus((n) => n + 1);
      },
      confirmDelete: () => setConfirmingDelete(true),
      cancelDelete: () => setConfirmingDelete(false),
    },
  };
}
