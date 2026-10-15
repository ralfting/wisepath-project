'use client';

import { Highlight, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import type { Page, Project } from '@wisepath/domain/projects';
import { mapTree, pathTo } from '@wisepath/domain/projects';
import { displayTitle } from '@/features/shared/title';
import { useT } from '@/i18n/I18nProvider';
import { PageIcon, StatusIcon } from './MindMap';
import classes from './MapSearchResults.module.css';

/**
 * MapSearchResults
 * The pages the search finds, as a list under it: the map keeps lighting them
 * up, and a click on one opens it in the drawer. Each says where it sits, so
 * pages with the same name can be told apart. The arrow keys in the search
 * move through it, Enter opens the one marked.
 */
export const SEARCH_RESULTS_ID = 'map-search-results';

export function MapSearchResults({
  project,
  query,
  results,
  active,
  selectedId,
  currentId,
  progress,
  onActive,
  onSelect,
  className,
}: {
  className?: string;
  project: Project;
  query: string;
  results: ReadonlyArray<Page>;
  active: number;
  selectedId: string | null;
  currentId: string | null;
  /** A learning path marks what was studied; a study doesn't */
  progress: boolean;
  onActive: (index: number) => void;
  onSelect: (pageId: string) => void;
}) {
  const t = useT();
  const tree = mapTree(project);
  const where = (page: Page) => {
    if (page.id === project.rootPageId) return t('map.results.centre');
    if (!tree.nodes.has(page.id)) return t('map.results.offMap');
    const path = pathTo(project, page.id, tree);
    return t('map.results.inPage', { title: displayTitle(path[path.length - 2] ?? tree.root.page) });
  };

  return (
    <div className={`${classes.panel} ${className ?? ''}`}>
      <Text size="xs" c="dimmed" fw={600} px={10} pt={8} pb={4}>
        {t('map.results.count', { count: results.length })}
      </Text>
      {results.length > 0 && (
        <ScrollArea.Autosize mah={300} type="auto">
          <div id={SEARCH_RESULTS_ID} role="listbox" aria-label={t('map.results.label')} className={classes.list}>
            {results.map((page, i) => (
              <UnstyledButton
                key={page.id}
                id={`${SEARCH_RESULTS_ID}-${i}`}
                role="option"
                aria-selected={i === active}
                className={classes.row}
                data-active={i === active || undefined}
                data-open={page.id === selectedId || undefined}
                // Keeps the cursor in the search, so typing and the arrows go on working
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onActive(i)}
                onClick={() => onSelect(page.id)}
              >
                {progress ? <StatusIcon status={page.studied ? 'done' : page.id === currentId ? 'current' : 'todo'} size={16} /> : <PageIcon size={16} />}
                <span className={classes.text}>
                  <Highlight highlight={query.trim()} size="sm" fw={500} truncate>
                    {displayTitle(page)}
                  </Highlight>
                  <Text size="xs" c="dimmed" truncate>
                    {where(page)}
                  </Text>
                </span>
              </UnstyledButton>
            ))}
          </div>
        </ScrollArea.Autosize>
      )}
    </div>
  );
}
