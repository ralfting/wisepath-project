'use client';

import { UnstyledButton } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Page, Project } from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { PagePanel } from '@/features/page/PagePanel';
import classes from './MapSearchResults.module.css';

/**
 * MapSearchPage
 * A page opened from the search's results, in the same panel the results were
 * in, as a map app shows a place: the eye stays where it was, and the arrow
 * at the top goes back to the results. Pages reached from it (its links, its
 * branches) open here too; the drawer is one click away.
 */
export function MapSearchPage({
  project,
  page,
  store,
  resultCount,
  className,
  onBack,
  onSelect,
  onOpenInDrawer,
}: {
  project: Project;
  page: Page;
  store: ProjectActions;
  resultCount: number;
  className?: string;
  onBack: () => void;
  onSelect: (pageId: string) => void;
  onOpenInDrawer: () => void;
}) {
  return (
    <div className={`${classes.panel} ${classes.pagePanel} ${className ?? ''}`}>
      <UnstyledButton
        className={classes.back}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onBack}
        aria-label="Back to the results"
      >
        <IconArrowLeft size={16} />
        <span>{resultCount === 1 ? '1 result' : `${resultCount} results`}</span>
      </UnstyledButton>
      <div className={classes.pageBody}>
        <PagePanel
          key={page.id}
          project={project}
          page={page}
          store={store}
          onSelect={onSelect}
          onExpand={onOpenInDrawer}
          expandLabel="Open beside the map"
          flat
        />
      </div>
    </div>
  );
}
