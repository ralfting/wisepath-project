'use client';

import { Paper, Text, TextInput } from '@mantine/core';
import { IconFilePlus } from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { findPageByTitle } from '@wisepath/domain/paths';
import type { PreviewPage } from '../LinkPreview/LinkPreview';
import classes from './MarkdownEditor.module.css';
import { useT } from '@/i18n/I18nProvider';
import { useIsMac } from '@/ui/platform';

/** The text a popup belongs to, in window coordinates */
export type Anchor = { top: number; bottom: number; left: number };

/** The Page command waiting for a name: where its link goes, and where to show the field */
export type PagePrompt = { at: number; anchor: Anchor };

/**
 * Where a popup of about this size goes: below its text, or above it when the
 * window has more room there, kept inside the window and scrolling if it must
 */
export function placeNear(anchor: Anchor, width: number, height: number): CSSProperties {
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const below = window.innerHeight - anchor.bottom - 14;
  const above = anchor.top - 14;
  return below >= height || below >= above
    ? { top: anchor.bottom + 6, left, maxHeight: below }
    : { bottom: window.innerHeight - anchor.top + 6, left, maxHeight: above };
}

/**
 * The Page command's name field. Enter links the page where / was typed and
 * goes to it: a name no page has creates the page, a taken one opens that page.
 * Cmd/Ctrl+Enter does the same but stays here, to list several pages in a row.
 */
export function PageNamePrompt({
  prompt,
  pages,
  currentPageId,
  onCancel,
  onSubmit,
}: {
  prompt: PagePrompt;
  pages: ReadonlyArray<PreviewPage>;
  currentPageId: string;
  onCancel: () => void;
  onSubmit: (title: string, page: PreviewPage | undefined, stay: boolean) => void;
}) {
  const t = useT();
  const mod = useIsMac() ? '⌘' : 'Ctrl+';
  const [name, setName] = useState('');
  const title = name.trim();
  const page = title ? findPageByTitle(pages, title) : undefined;
  const isThisPage = page?.id === currentPageId;
  const note = isThisPage
    ? t('editor.newPage.isThisPage')
    : page
      ? t('editor.newPage.exists', { mod })
      : t('editor.newPage.creates', { mod });

  return (
    <Paper withBorder shadow="md" p="sm" role="dialog" aria-label={t('editor.newPage.dialog')} className={classes.prompt} style={placeNear(prompt.anchor, 288, 110)}>
      <TextInput
        size="sm"
        aria-label={t('editor.newPage.name')}
        placeholder={t('editor.newPage.name')}
        leftSection={<IconFilePlus size={16} stroke={1.5} />}
        value={name}
        autoFocus
        // Keeps Esc here: the drawer around the editor would close on it
        data-mantine-stop-propagation
        onChange={(e) => setName(e.currentTarget.value)}
        // Clicking elsewhere on the page cancels; switching to another window does not
        onBlur={() => {
          if (document.hasFocus()) onCancel();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (title && !isThisPage) onSubmit(page ? page.title.trim() : title, page, e.metaKey || e.ctrlKey);
          }
        }}
      />
      <Text size="xs" c={isThisPage ? 'red' : 'dimmed'} mt={6}>
        {note}
      </Text>
    </Paper>
  );
}
