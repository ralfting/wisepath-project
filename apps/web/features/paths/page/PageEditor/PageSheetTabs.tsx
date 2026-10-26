'use client';

import { Tabs } from '@mantine/core';
import type { Page, Path } from '@wisepath/domain/paths';
import type { EditorFocus } from '@/features/paths/editor';
import { useT } from '@/i18n/I18nProvider';
import { PageContent } from '../PageContent/PageContent';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NotesTab } from '../PageNotes/NotesTab';
import { PageNotes } from '../PageNotes/PageNotes';
import { usePageNotes } from '../PageNotes/usePageNotes';
import type { SheetTab } from './usePageSheet';

interface PageSheetTabsProps {
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
  readonly tab: SheetTab;
  readonly onTab: (tab: SheetTab) => void;
  readonly focusEditor: EditorFocus | null;
  readonly onCursor?: (pos: number) => void;
  readonly focusSignal: number;
}

/**
 * PageSheetTabs
 * The full page's text and the reader's own notes on it, a tab each. Keyed by the page, so a note open on one page
 * never stays open on the next.
 */
export function PageSheetTabs({ path, page, actions, tab, onTab, focusEditor, onCursor, focusSignal }: PageSheetTabsProps) {
  const t = useT();
  const notes = usePageNotes(page, actions, () => onTab('content'));

  return (
    <Tabs value={tab} onChange={(value) => onTab(value === 'notes' ? 'notes' : 'content')}>
      <Tabs.List mb="md">
        <Tabs.Tab value="content">{t('page.tabs.content')}</Tabs.Tab>
        <NotesTab count={notes.list.notes.length} />
      </Tabs.List>
      <Tabs.Panel value="content">
        <PageContent
          path={path}
          page={page}
          actions={actions}
          notes={notes.text}
          showTitle={false}
          toolbarOffset={0}
          focusEditor={focusEditor}
          onCursor={onCursor}
          focusSignal={focusSignal}
        />
      </Tabs.Panel>
      <Tabs.Panel value="notes">
        <PageNotes list={notes.list} path={path} page={page} actions={actions} />
      </Tabs.Panel>
    </Tabs>
  );
}
