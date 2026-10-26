'use client';

import { Box, Group, Popover, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { NoteEditor } from './NoteEditor';
import type { Spot } from './PageNotes.helpers';
import { useClosing } from './useClosing';
import type { NoteWriting } from './usePageNotes';
import classes from './PageNotes.module.css';

interface NoteCardProps {
  readonly card: NoteWriting & { readonly spot: Spot };
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * NoteCard
 * One of the reader's notes, open by the passage it is on: written in the lean editor, deleted from here, closed with
 * Esc or a click outside.
 */
export function NoteCard({ card, path, page, actions }: NoteCardProps) {
  const t = useT();
  useClosing(card.close);

  return (
    <Popover opened closeOnEscape={false} closeOnClickOutside={false} withRoles={false} position="bottom-start" shadow="md" withinPortal returnFocus>
      <Popover.Target>
        {/* Nothing to see: only where the card points, placed over the passage at runtime */}
        <Box pos="absolute" aria-hidden className={classes.spot} style={{ top: card.spot.top, left: card.spot.left, width: card.spot.width, height: card.spot.height }} />
      </Popover.Target>
      <Popover.Dropdown className={classes.card} role="dialog" aria-label={t('page.notes.card')}>
        <NoteEditor writing={card} path={path} page={page} actions={actions}>
          <Group gap="xs" c="dimmed">
            <IconLock size={14} stroke={1.5} aria-hidden />
            <Text size="xs">{t('page.notes.private')}</Text>
          </Group>
        </NoteEditor>
      </Popover.Dropdown>
    </Popover>
  );
}
