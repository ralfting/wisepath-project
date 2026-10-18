'use client';

import { Stack, Text, Title } from '@mantine/core';
import type { PendingPublication } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { AppFrame } from '@/features/shell';
import { PublicationRow } from './PublicationRow';

/** The requests to publish paths to the catalog, oldest first, for an administrator to read and decide */
export function PublicationQueue({ requests, now }: { requests: ReadonlyArray<PendingPublication>; now: number }) {
  const t = useT();
  return (
    <AppFrame crumbs={[{ label: t('admin.publications.title') }]}>
      <Stack gap="lg" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={820} w="100%">
        <Stack gap={4}>
          <Title order={1}>{t('admin.publications.title')}</Title>
          <Text c="dimmed">{t('admin.publications.intro')}</Text>
        </Stack>
        {requests.length === 0 ? (
          <Text c="dimmed">{t('admin.publications.none')}</Text>
        ) : (
          requests.map((request) => <PublicationRow key={request.pathId} request={request} now={now} />)
        )}
      </Stack>
    </AppFrame>
  );
}
