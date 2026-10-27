'use client';

import { Box, Text } from '@mantine/core';
import { citingPages } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';

/**
 * An unlinked page's title in the lists of pages off the map, with the pages that cite it under it: a citation points
 * at a page without placing it, so those are where the learner meets it
 */
export function OrphanTitle({ path, page }: { path: Path; page: Page }) {
  const t = useT();
  const citing = citingPages(path, page.id);
  return (
    <Box miw={0}>
      <Text size="sm" truncate>
        {displayTitle(page)}
      </Text>
      {citing.length > 0 && (
        <Text size="xs" c="dimmed" truncate>
          {t('map.orphans.citedBy', { titles: citing.map(displayTitle).join(', ') })}
        </Text>
      )}
    </Box>
  );
}
