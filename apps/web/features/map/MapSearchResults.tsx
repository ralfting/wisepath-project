'use client';

import { Highlight, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import type { Page, Project } from '@wisepath/domain/projects';
import { displayTitle, mapTree, pathTo } from '@wisepath/domain/projects';
import { StatusIcon } from './MindMap';
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
  onActive,
  onSelect,
}: {
  project: Project;
  query: string;
  results: ReadonlyArray<Page>;
  active: number;
  selectedId: string | null;
  currentId: string | null;
  onActive: (index: number) => void;
  onSelect: (pageId: string) => void;
}) {
  const tree = mapTree(project);
  const where = (page: Page) => {
    if (page.id === project.rootPageId) return 'Centre of the path';
    if (!tree.nodes.has(page.id)) return 'Not on the map';
    const path = pathTo(project, page.id, tree);
    return `In ${displayTitle(path[path.length - 2] ?? tree.root.page)}`;
  };

  return (
    <div className={classes.panel}>
      <Text size="xs" c="dimmed" fw={600} px={10} pt={8} pb={4}>
        {results.length === 0 ? 'No page matches' : results.length === 1 ? '1 page' : `${results.length} pages`}
      </Text>
      {results.length > 0 && (
        <ScrollArea.Autosize mah={300} type="auto">
          <div id={SEARCH_RESULTS_ID} role="listbox" aria-label="Pages found" className={classes.list}>
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
                <StatusIcon status={page.studied ? 'done' : page.id === currentId ? 'current' : 'todo'} size={16} />
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
