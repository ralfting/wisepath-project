'use client';

import { Button } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import type { Page, Project } from '@wisepath/domain/projects';
import { displayTitle, nextPage } from '@wisepath/domain/projects';

/**
 * NextPageButton
 * Once a page is marked studied, the way on: the next page not studied yet,
 * in the path's order, without going back to the map.
 */
export function NextPageButton({ project, page, onOpen }: { project: Project; page: Page; onOpen: (pageId: string) => void }) {
  const next = nextPage(project);
  if (!page.studied || !next || next.id === page.id) return null;
  return (
    <Button
      size="compact-sm"
      variant="light"
      rightSection={<IconArrowRight size={14} />}
      onClick={() => onOpen(next.id)}
      maw={260}
      styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
    >
      Next: {displayTitle(next)}
    </Button>
  );
}
