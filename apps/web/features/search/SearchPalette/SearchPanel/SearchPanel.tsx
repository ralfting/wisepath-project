'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Group, Kbd, Loader, ScrollArea, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { paletteFieldProps } from '@/ui/Palette/usePaletteKeys';
import { IconFileText, IconSearch } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from '../SearchPalette.module.css';
import { LIST_ID, optionId } from '../SearchPalette.helpers';
import { Marked } from '../Marked';
import { Hint } from '../Hint';
import { useHasKeyboard, useIsMac } from '@/ui/platform';
import { useSearchPanel } from './useSearchPanel';

/** The field and the list; `onDone` is called once a page is opened, or on Esc */
export function SearchPanel({ onDone }: { onDone: () => void }) {
  const t = useT();
  const mod = useIsMac() ? '⌘' : 'Ctrl';
  const hasKeyboard = useHasKeyboard();
  const { state, operations } = useSearchPanel({ onDone });
  const { rows, active } = state;

  const heading = state.heading === 'recent' ? t('search.recent.title') : state.heading === 'found' ? t('search.found.title', { count: rows.length }) : null;
  const message: ReactNode =
    state.notice === 'recentEmpty' ? (
      t('search.recent.empty')
    ) : state.notice === 'noneFound' ? (
      t('search.found.none', { query: state.searchedFor })
    ) : state.notice === 'unavailable' ? (
      <>
        {t('common.errors.unavailable')}{' '}
        <UnstyledButton onClick={operations.retry} className={classes.retry}>
          {t('common.actions.retry')}
        </UnstyledButton>
      </>
    ) : null;
  const announcement = state.settled ? (rows.length ? t('search.found.title', { count: rows.length }) : message) : null;

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
          value={state.query}
          onChange={(event) => operations.setQuery(event.currentTarget.value)}
          onKeyDown={operations.keyDown}
          placeholder={t('search.palette.placeholder')}
          aria-label={t('search.palette.label')}
          {...paletteFieldProps(LIST_ID, active, rows.length)}
          autoComplete="off"
          spellCheck={false}
        />
        {state.busy && <Loader size={16} aria-label={t('search.found.searching')} />}
        {hasKeyboard && (
          <Kbd size="xs" className={classes.escHint} aria-hidden>
            Esc
          </Kbd>
        )}
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
              onMouseMove={() => operations.setActive(i)}
              onClick={(event: MouseEvent) => operations.open(row, event.metaKey || event.ctrlKey)}
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

      {hasKeyboard && (
        <Group gap="md" className={classes.hints} aria-hidden>
          <Hint keys={['↑', '↓']} label={t('search.hints.move')} />
          <Hint keys={['↵']} label={t('search.hints.open')} />
          <Hint keys={[mod, '↵']} label={t('search.hints.full')} />
          <Hint keys={['Esc']} label={t('search.hints.close')} />
        </Group>
      )}
    </div>
  );
}
