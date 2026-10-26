'use client';

import { useId, useState } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconLock, IconPlus } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { useT } from '@/i18n/I18nProvider';
import type { PageActions } from '../PageContent/PageContent.helpers';

interface PageNotesProps {
  readonly path: Path;
  readonly page: Page;
  readonly actions: PageActions;
}

/**
 * PageNotes
 * The reader's own notes under a page, on a ground of their own so they never read as the page's text. Nobody else
 * sees them, so anyone who can read the page may write them. Empty, they are one quiet button that opens the editor.
 */
export function PageNotes({ path, page, actions }: PageNotesProps) {
  const t = useT();
  const titleId = useId();
  const [writing, setWriting] = useState(false);
  const hasNotes = !!page.notes?.trim();

  return (
    <Paper component="section" aria-labelledby={titleId} withBorder radius="md" p="md" bg="var(--wp-ground)">
      <Stack gap="xs">
        <Group gap="xs">
          <IconLock size={16} stroke={1.5} aria-hidden />
          <Text id={titleId} size="sm" fw={600}>
            {t('page.notes.title')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('page.notes.private')}
          </Text>
        </Group>
        {hasNotes || writing ? (
          <MarkdownEditor
            variant="notes"
            content={page.notes ?? ''}
            onChange={(notes) => actions.updatePage(page.id, { notes })}
            pages={path.pages}
            currentPageId={page.id}
            onOpenPage={actions.openPage}
            onLinkPage={() => {}}
            onCreatePage={actions.createLinkedPage}
            onCreatePageHere={actions.createPage}
            focusOnOpen={writing ? 'end' : null}
          />
        ) : (
          <Group>
            <Button
              variant="subtle"
              size="compact-sm"
              color="gray"
              leftSection={<IconPlus size={14} stroke={1.5} />}
              onClick={() => setWriting(true)}
            >
              {t('page.notes.add')}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
