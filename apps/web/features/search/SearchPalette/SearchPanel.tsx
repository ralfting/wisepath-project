'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Group, Kbd, Loader, ScrollArea, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { paletteFieldProps, usePaletteKeys } from '@/features/inbox/capture';
import { IconFileText, IconSearch } from '@tabler/icons-react';
import { marksIn } from '@wisepath/domain/search';
import { mapWithPageHref, pageHref } from '@/shared/routes';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { usePaths } from '@/useCases/paths';
import { usePageSearch, useRecentPages } from '@/useCases/search';
import classes from './SearchPalette.module.css';
import { LIST_ID, optionId, useModKey } from './SearchPalette.helpers';
import { Marked } from './Marked';
import { Hint } from './Hint';
import type { Row } from './SearchPalette.helpers';

/** The field and the list; `onDone` is called once a page is opened, or on Esc */
export function SearchPanel({ onDone }: { onDone: () => void }) {
  const t = useT();
  const router = useRouter();
  const mod = useModKey();
  const { query, setQuery, state, retry } = usePageSearch();
  const recent = useRecentPages();
  const paths = usePaths();

  // Each opening starts afresh, on the recent pages; before the field can take a key
  useLayoutEffect(() => setQuery(''), [setQuery]);

  const rows = useMemo((): ReadonlyArray<Row> => {
    if (state.status === 'ready') {
      return state.hits.map((hit) => {
        const title = displayTitle(hit);
        return {
          key: `${hit.pathId}/${hit.pageId}`,
          pathId: hit.pathId,
          pageId: hit.pageId,
          title,
          titleMarks: marksIn(title, state.query),
          where: [hit.pathTitle, ...hit.where.map((w) => displayTitle({ title: w }))].join(' › '),
          excerpt: hit.excerpt,
        };
      });
    }
    if (state.status !== 'idle') return [];
    // A path deleted since is dropped, and one renamed shows its title now
    const titles = paths ? new Map(paths.map((p) => [p.id as string, p.title])) : null;
    return recent
      .filter((page) => !titles || titles.has(page.pathId))
      .map((page) => ({
        key: `${page.pathId}/${page.pageId}`,
        pathId: page.pathId,
        pageId: page.pageId,
        title: displayTitle(page),
        titleMarks: [],
        where: titles?.get(page.pathId) ?? page.pathTitle,
        excerpt: null,
      }));
  }, [state, recent, paths]);

  const open = (row: Row, full: boolean) => {
    onDone();
    // A page URL loaded directly is the full page; navigating to it inside the app would open the drawer instead
    if (full) window.location.assign(pageHref(row.pathId, row.pageId));
    // On its map, the page opens in the drawer
    else router.push(mapWithPageHref(row.pathId, row.pageId));
  };

  // The row the arrows mark, opened by Enter; back to the first whenever the list changes
  const keys = usePaletteKeys(rows, (row) => open(row, false));
  const { active, setActive } = keys;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Only the palette closes: a drawer open behind it stays
      event.preventDefault();
      event.stopPropagation();
      onDone();
      return;
    }
    // ⌘Enter opens the marked row as a full page; the rest (↑ ↓ Enter) is the palette's
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && rows[active] && !event.nativeEvent.isComposing) {
      event.preventDefault();
      open(rows[active], true);
      return;
    }
    keys.onKeyDown(event);
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
          // Focused at once, not after the card's transition, so the keys typed right after ⌘P land here
          autoFocus
          data-autofocus
          // Mantine's drawer closes on any Esc in the window, unless told this one is taken
          data-mantine-stop-propagation
          className={classes.input}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          placeholder={t('search.palette.placeholder')}
          aria-label={t('search.palette.label')}
          {...paletteFieldProps(LIST_ID, active, rows.length)}
          autoComplete="off"
          spellCheck={false}
        />
        {busy && <Loader size={16} aria-label={t('search.found.searching')} />}
        <Kbd size="xs" className={classes.escHint} aria-hidden>
          Esc
        </Kbd>
      </div>

      <VisuallyHidden role="status">{announcement}</VisuallyHidden>

      <ScrollArea.Autosize mah="min(420px, 60vh)" type="auto" scrollbars="y">
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
