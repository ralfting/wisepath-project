'use client';

import { Container, Grid, Skeleton, Stack } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';

/** The public path's layout while it is read: the title, the list of pages and the page (a client component: Grid.Col) */
export default function PublicPathLoading() {
  const t = useT();
  return (
    <Container component="main" size="xl" py="xl" aria-busy="true" aria-label={t('share.public.loading')}>
      <Stack gap="xl">
        <Stack gap="xs">
          <Skeleton height={20} width={110} radius="xl" />
          <Skeleton height={40} width="50%" />
        </Stack>
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Skeleton height={320} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Skeleton height={420} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
