'use client';

import { Card, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { useT } from '@/i18n/I18nProvider';

const CARDS = 3;

/** The paths page while its paths load: cards shaped like `PathCard`, so the page does not jump when they arrive */
export function PathsHomeSkeleton() {
  const t = useT();
  // Mantine's pulse ignores the system setting
  const animate = !useReducedMotion();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" role="status" aria-busy aria-label={t('home.loading')}>
      {Array.from({ length: CARDS }, (_, index) => (
        <Card key={index} padding="lg">
          <Stack gap="md">
            <Group gap="md" wrap="nowrap">
              <Skeleton animate={animate} circle height={52} />
              <Stack gap="xs" style={{ flex: 1 }}>
                <Skeleton animate={animate} height={20} width="70%" />
                <Skeleton animate={animate} height={12} width="45%" />
              </Stack>
            </Group>
            <Stack gap={6}>
              <Skeleton animate={animate} height={8} radius="xl" />
              <Skeleton animate={animate} height={10} width="55%" />
            </Stack>
            <Skeleton animate={animate} height={36} />
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
