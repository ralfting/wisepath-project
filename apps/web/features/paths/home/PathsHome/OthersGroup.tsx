'use client';

import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { PathCard } from './PathCard';

/** Paths from others: shared with the learner or public ones they took to study; each stays its owner's */
export function OthersGroup({ paths }: { paths: ReadonlyArray<PathSummary> }) {
  const t = useT();
  return (
    <Stack component="section" gap="md" aria-labelledby="from-others">
      <Stack gap={2}>
        <Title order={2} fz={20} id="from-others">
          {t('share.from.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('share.from.hint')}
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {paths.map((path) => (
          <PathCard key={path.id} path={path} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
