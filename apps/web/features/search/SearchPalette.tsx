'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Group, Kbd, Loader, Modal, ScrollArea, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconFileText, IconSearch } from '@tabler/icons-react';
import { marksIn } from '@wisepath/domain/search';
import type { Mark } from '@wisepath/domain/search';
import { mapWithPageHref, pageHref } from '@/features/shared/routes';
import { displayTitle } from '@/features/shared/title';
import { useT } from '@/i18n/I18nProvider';
import { useProjects } from '@/useCases/projects';
import { usePageSearch, useRecentPages } from '@/useCases/search';
import classes from './SearchPalette.module.css';

/**
 * Search everywhere
 * ⌘P (Ctrl P) anywhere in the app opens a palette in the middle of the
 * screen. Empty, it offers the pages opened most recently; typing searches
 * every path, by title and then by text. ↑ ↓ move, Enter opens the page on
 * its map (in the drawer), ⌘Enter as a full page, Esc closes.
 *
 * SearchPanel is the palette's content on its own (the field and the list),
 * so a palette shell shared with other modes can host it; SearchPalette puts
 * it in a centred card that holds the focus; SearchPaletteHost owns the
 * shortcut and is mounted once, by the app frame.
 */

/** Asks the mounted host to open the palette, from a button or another shortcut */
export const OPEN_SEARCH_PALETTE_EVENT = 'wisepath:open-search-palette';

export function openSearchPalette(): void {
  window.dispatchEvent(new Event(OPEN_SEARCH_PALETTE_EVENT));
}

const LIST_ID = 'search-palette-list';
const optionId = (i: number) => `${LIST_ID}-${i}`;

/** True for ⌘P on a Mac, Ctrl P elsewhere: the key editors use to go to a file */
const isSearchShortcut = (event: globalThis.KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'p';

/** ⌘ on a Mac, Ctrl elsewhere, as the hints write it */
function useModKey(): string {
  const [mod, setMod] = useState('Ctrl');
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setMod('⌘');
  }, []);
  return mod;
}

/** The palette, opened by ⌘P from anywhere (fields and the editor included) or by openSearchPalette */
export function SearchPaletteHost() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    // Capture: the editor and the browser's print dialog must not see it first
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpened((open) => !open);
    };
    const onOpen = () => setOpened(true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    };
  }, []);

  return <SearchPalette opened={opened} onClose={() => setOpened(false)} />;
}

/** The search in a centred card: the focus stays inside until it closes, then goes back where it was */
export function SearchPalette({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal.Root opened={opened} onClose={onClose} centered size={640} radius="lg" trapFocus returnFocus>
      <Modal.Overlay backgroundOpacity={0.35} blur={2} />
      <Modal.Content aria-label={t('search.palette.label')} className={classes.card}>
        <SearchPanel onDone={onClose} />
      </Modal.Content>
    </Modal.Root>
  );
}

/** One row of the list, from a search result or a recent page */
interface Row {
  key: string;
  projectId: string;
  pageId: string;
  title: string;
  titleMarks: ReadonlyArray<Mark>;
  where: string;
  excerpt: { text: string; marks: ReadonlyArray<Mark> } | null;
}

/** The field and the list; `onDone` is called once a page is opened, or on Esc */
export function SearchPanel({ onDone }: { onDone: () => void }) {
  const t = useT();
  const router = useRouter();
  const mod = useModKey();
  const { query, setQuery, state, retry } = usePageSearch();
  const recent = useRecentPages();
  const projects = useProjects();

  // Each opening starts afresh, on the recent pages
  useEffect(() => setQuery(''), [setQuery]);

  const rows = useMemo((): ReadonlyArray<Row> => {
    if (state.status === 'ready') {
      return state.hits.map((hit) => {
        const title = displayTitle(hit);
        return {
          key: `${hit.projectId}/${hit.pageId}`,
          projectId: hit.projectId,
          pageId: hit.pageId,
          title,
          titleMarks: marksIn(title, state.query),
          where: [hit.projectTitle, ...hit.where.map((w) => displayTitle({ title: w }))].join(' › '),
          excerpt: hit.excerpt,
        };
      });
    }
    if (state.status !== 'idle') return [];
    // A path deleted since is dropped, and one renamed shows its title now
    const paths = projects ? new Map(projects.map((p) => [p.id as string, p.title])) : null;
    return recent
      .filter((page) => !paths || paths.has(page.projectId))
      .map((page) => ({
        key: `${page.projectId}/${page.pageId}`,
        projectId: page.projectId,
        pageId: page.pageId,
        title: displayTitle(page),
        titleMarks: [],
        where: paths?.get(page.projectId) ?? page.projectTitle,
        excerpt: null,
      }));
  }, [state, recent, projects]);

  // The row the arrows mark, opened by Enter; back to the first whenever the list changes
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [rows]);

  const open = (row: Row, full: boolean) => {
    onDone();
    // On its map, the page opens in the drawer; ⌘ asks for the full page instead
    router.push(full ? pageHref(row.projectId, row.pageId) : mapWithPageHref(row.projectId, row.pageId));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Only the palette closes: a drawer open behind it stays
      event.preventDefault();
      event.stopPropagation();
      onDone();
      return;
    }
    if (rows.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + rows.length) % rows.length);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      open(rows[Math.min(active, rows.length - 1)], event.metaKey || event.ctrlKey);
    }
  };

  // The marked row stays in view as the arrows move it
  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const heading =
    state.status === 'idle'
      ? recent.length > 0 && t('search.recent.title')
      : state.status === 'ready' && rows.length > 0 && t('search.found.title', { count: rows.length });

  let message: ReactNode = null;
  if (state.status === 'idle' && rows.length === 0) message = t('search.recent.empty');
  if (state.status === 'ready' && rows.length === 0 && !state.stale) message = t('search.found.none', { query: state.query });
  if (state.status === 'unavailable')
    message = (
      <>
        {t('common.errors.unavailable')}{' '}
        <UnstyledButton onClick={retry} className={classes.retry}>
          {t('common.actions.retry')}
        </UnstyledButton>
      </>
    );

  const busy = state.status === 'loading' || (state.status === 'ready' && state.stale);
  // Said out loud as it changes: how many pages were found, or that none was
  const announcement = state.status === 'ready' && !state.stale ? (rows.length ? t('search.found.title', { count: rows.length }) : message) : null;

  return (
    <div className={classes.panel}>
      <div className={classes.field}>
        <IconSearch size={20} stroke={1.8} className={classes.fieldIcon} aria-hidden />
        <input
          data-autofocus
          className={classes.input}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          placeholder={t('search.palette.placeholder')}
          aria-label={t('search.palette.label')}
          role="combobox"
          aria-expanded={rows.length > 0}
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={rows.length > 0 ? optionId(Math.min(active, rows.length - 1)) : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {busy && <Loader size={16} aria-label={t('search.found.searching')} />}
        <Kbd size="xs" className={classes.escHint} aria-hidden>
          Esc
        </Kbd>
      </div>

      <VisuallyHidden role="status">{announcement}</VisuallyHidden>

      <ScrollArea.Autosize mah="min(420px, 60vh)" type="auto">
        {heading && (
          <Text size="xs" fw={600} c="dimmed" className={classes.heading}>
            {heading}
          </Text>
        )}
        <div id={LIST_ID} role="listbox" aria-label={heading || t('search.palette.results')} className={classes.list}>
          {rows.map((row, i) => (
            <UnstyledButton
              key={row.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              className={classes.row}
              data-active={i === active || undefined}
              // Keeps the cursor in the field, so typing and the arrows go on working
              onMouseDown={(event: MouseEvent) => event.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={(event: MouseEvent) => open(row, event.metaKey || event.ctrlKey)}
            >
              <IconFileText size={18} stroke={1.6} className={classes.rowIcon} aria-hidden />
              <span className={classes.rowText}>
                <span className={classes.title}>
                  <Marked text={row.title} marks={row.titleMarks} />
                </span>
                <span className={classes.where}>{row.where}</span>
                {row.excerpt && (
                  <span className={classes.excerpt}>
                    <Marked text={row.excerpt.text} marks={row.excerpt.marks} />
                  </span>
                )}
              </span>
            </UnstyledButton>
          ))}
        </div>
        {message && (
          <Text size="sm" c="dimmed" className={classes.message}>
            {message}
          </Text>
        )}
      </ScrollArea.Autosize>

      <Group gap="md" className={classes.hints} aria-hidden>
        <Hint keys={['↑', '↓']} label={t('search.hints.move')} />
        <Hint keys={['↵']} label={t('search.hints.open')} />
        <Hint keys={[mod, '↵']} label={t('search.hints.full')} />
        <Hint keys={['Esc']} label={t('search.hints.close')} />
      </Group>
    </div>
  );
}

function Hint({ keys, label }: { keys: ReadonlyArray<string>; label: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      {keys.map((key) => (
        <Kbd key={key} size="xs">
          {key}
        </Kbd>
      ))}
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

/** The text with what matched marked */
function Marked({ text, marks }: { text: string; marks: ReadonlyArray<Mark> }) {
  if (marks.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [start, end] of marks) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className={classes.mark}>
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
