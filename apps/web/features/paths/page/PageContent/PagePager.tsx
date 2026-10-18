'use client';

import { Group, Text, UnstyledButton } from '@mantine/core';
import { neighbours } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { displayTitle } from '@/i18n/title';
import classes from './PageContent.module.css';

/**
 * The pages before and after this one in the map's reading order (down into a branch, on to the next beside it, back
 * up), so a reader always has a way on. Nothing for an unlinked page.
 */
export function PagePager({ path, page, onOpen }: { path: Path; page: Page; onOpen: (pageId: string) => void }) {
  const t = useT();
  const { previous, next } = neighbours(path, page.id);
  if (!previous && !next) return null;
  return (
    <Group component="nav" aria-label={t('page.pager.label')} justify="space-between" align="flex-start" className={classes.pager}>
      {previous ? (
        <UnstyledButton onClick={() => onOpen(previous.id)} className={classes.pagerLink}>
          <Text span size="xs" c="dimmed" display="block">
            ← {t('page.pager.previous')}
          </Text>
          <Text span size="sm" fw={600}>
            {displayTitle(previous)}
          </Text>
        </UnstyledButton>
      ) : (
        <span />
      )}
      {next && (
        <UnstyledButton onClick={() => onOpen(next.id)} className={classes.pagerLink} ta="right">
          <Text span size="xs" c="dimmed" display="block">
            {t('page.pager.next')} →
          </Text>
          <Text span size="sm" fw={600}>
            {displayTitle(next)}
          </Text>
        </UnstyledButton>
      )}
    </Group>
  );
}
