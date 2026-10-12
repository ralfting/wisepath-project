'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { Page, Project } from '@wisepath/domain/projects';
import { PageContent } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';
import { ActionIcon, Button, Group } from '@mantine/core';
import { IconArrowsDiagonal, IconFlag, IconX } from '@tabler/icons-react';
import classes from './PageSheet.module.css';

/**
 * PageSheet
 * The open page beside the map, editable in place. Esc closes it.
 */

interface PageSheetProps {
  project: Project;
  page: Page;
  actions: PageActions;
  isFresh: boolean;
  fullPageHref: string;
  isStart: boolean;
  onToggleStart: () => void;
  onClose: () => void;
}

export function PageSheet({ project, page, actions, isFresh, fullPageHref, isStart, onToggleStart, onClose }: PageSheetProps) {
  // Esc closes the sheet unless a field is being edited (fields handle Esc themselves)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        active.blur();
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside aria-label="Page" className={classes.sheet}>
      <Group justify="space-between" gap="xs" className={classes.bar}>
        <Group gap={4}>
          <StudiedToggle studied={page.studied} onChange={(studied) => actions.updatePage(page.id, { studied })} />
          <Button
            variant="subtle"
            color="gray"
            c="var(--mantine-color-text)"
            size="compact-sm"
            fw={isStart ? 700 : 400}
            leftSection={<IconFlag size={15} color={isStart ? 'var(--mantine-color-atlas-7)' : undefined} />}
            aria-pressed={isStart}
            onClick={onToggleStart}
            title={isStart ? 'This study starts here (level I)' : 'Make this the start of the study (level I)'}
          >
            Start page
          </Button>
        </Group>
        <Group gap={4}>
          <ActionIcon
            component={Link}
            href={fullPageHref}
            variant="subtle"
            color="gray"
            aria-label="Open full screen"
            title="Open full screen"
          >
            <IconArrowsDiagonal size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Close page" title="Close (Esc)">
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <div className={classes.body}>
        <PageContent key={page.id} project={project} page={page} actions={actions} isFresh={isFresh} />
      </div>
    </aside>
  );
}
