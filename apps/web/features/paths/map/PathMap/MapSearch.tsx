'use client';

import { ActionIcon, Kbd, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { useHasKeyboard, useIsMac } from '@/ui/platform';
import { MapSearchResults, SEARCH_RESULTS_ID } from '../MapSearchResults/MapSearchResults';
import classes from './PathMap.module.css';
import type { View } from './PathMap.helpers';
import type { useMapSearch } from './useMapSearch';

/**
 * The map's search: a button while folded (showing what it holds, with × to drop it), the field with what it found
 * hanging from it once open. The list view is that list already, so only the map shows the results under it.
 */
export function MapSearch({
  search,
  view,
  path,
  selectedId,
  currentId,
  progress,
}: {
  search: ReturnType<typeof useMapSearch>;
  view: View;
  path: Path;
  selectedId: string | null;
  currentId: Page['id'] | null;
  progress: boolean;
}) {
  const t = useT();
  const hasKeyboard = useHasKeyboard();
  const shortcut = useIsMac() ? '⌘K' : 'Ctrl K';
  const { state, operations } = search;

  if (state.open) {
    return (
      // The results hang from the field, lined up with its left edge
      <div ref={search.wrap} className={classes.searchWrap}>
        <TextInput
          ref={search.field}
          onBlur={operations.blur}
          type="search"
          aria-label={t('map.search.label')}
          placeholder={t('map.search.placeholder')}
          leftSection={<IconSearch size={16} />}
          rightSection={hasKeyboard ? <Kbd size="xs">{shortcut}</Kbd> : undefined}
          rightSectionWidth={hasKeyboard ? (shortcut === '⌘K' ? 44 : 58) : undefined}
          value={state.query}
          onChange={(event) => operations.setQuery(event.currentTarget.value)}
          onKeyDown={operations.keyDown}
          role="combobox"
          aria-expanded={!!state.matchIds}
          aria-controls={SEARCH_RESULTS_ID}
          aria-activedescendant={state.matchIds && state.results.length > 0 ? `${SEARCH_RESULTS_ID}-${state.active}` : undefined}
          className={classes.search}
          radius="md"
        />
        {view === 'map' && state.matchIds && (
          <MapSearchResults
            className={classes.results}
            path={path}
            query={state.query}
            results={state.results}
            active={state.active}
            selectedId={selectedId}
            currentId={currentId}
            progress={progress}
            onActive={operations.setActive}
            onSelect={operations.openResult}
          />
        )}
      </div>
    );
  }
  if (state.query) {
    return (
      // Folded with a search in it: the filter stays on, a click goes back to it, × drops it
      <div className={classes.searchButton} data-filter>
        <UnstyledButton onClick={operations.open} aria-label={t('map.search.withQuery', { query: state.query })} className={classes.searchReopen}>
          <IconSearch size={16} />
          <span className={classes.searchQuery}>{state.query}</span>
        </UnstyledButton>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('map.search.clear')} onClick={operations.clear}>
          <IconX size={14} />
        </ActionIcon>
      </div>
    );
  }
  return (
    <UnstyledButton
      onClick={operations.open}
      aria-label={hasKeyboard ? t('map.search.labelWithKeys', { keys: shortcut }) : t('map.search.label')}
      aria-keyshortcuts={hasKeyboard ? 'Control+K Meta+K' : undefined}
      className={classes.searchButton}
    >
      <IconSearch size={16} />
      {hasKeyboard && <Kbd size="xs">{shortcut}</Kbd>}
    </UnstyledButton>
  );
}
