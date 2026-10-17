'use client';

import { useEffect } from 'react';
import { canEdit } from '@wisepath/domain/paths';
import { Group, SegmentedControl, Text } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { usePath } from '@/useCases/paths';
import type { PageTarget } from '@/useCases/inbox';
import { displayTitle } from '@/i18n/title';
import classes from './QuickCapture.module.css';

/** Inbox or the page on screen; the page's title comes from its map, already open */
export function Destination({
  page,
  toPage,
  onChange,
  onTitle,
}: {
  page: PageTarget;
  toPage: boolean;
  onChange: (toPage: boolean) => void;
  onTitle: (title: string) => void;
}) {
  const t = useT();
  const { state } = usePath(page.pathId);
  // A path the learner may only read takes nothing: the Inbox is the only choice
  const found = state.status === 'ready' && canEdit(state.path.access) ? state.path.pages.find((p) => p.id === page.pageId) : undefined;
  const title = found ? displayTitle(found) : '';
  useEffect(() => {
    onTitle(title);
  }, [title, onTitle]);
  if (!found) return null;
  return (
    <Group className={classes.destination} gap="sm" wrap="nowrap">
      <Text size="xs" c="dimmed" id="capture-destination">
        {t('inbox.capture.destination')}
      </Text>
      <SegmentedControl
        size="xs"
        radius="md"
        aria-labelledby="capture-destination"
        value={toPage ? 'page' : 'inbox'}
        onChange={(value) => onChange(value === 'page')}
        data={[
          { value: 'inbox', label: t('inbox.capture.toInbox') },
          { value: 'page', label: <span className={classes.pageChoice}>{t('inbox.capture.toPage', { title })}</span> },
        ]}
      />
    </Group>
  );
}
