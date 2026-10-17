'use client';

import { Loader, Stack, Text } from '@mantine/core';
import { useShares } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { PersonRow } from './PersonRow';
import { ShareForm } from './ShareForm';

/** Who the path is shared with, each with their access, and the form that adds someone */
export function PeopleSection({ pathId }: { pathId: string }) {
  const t = useT();
  const shares = useShares(pathId);
  return (
    <Stack gap="sm">
      <Text fw={700} size="sm">
        {t('share.people.label')}
      </Text>
      <ShareForm pathId={pathId} />
      {shares.status === 'loading' && <Loader size="sm" aria-label={t('share.people.loading')} />}
      {shares.status === 'failed' && (
        <Text size="sm" c="red" role="alert">
          {t('common.errors.unavailable')}
        </Text>
      )}
      {shares.status === 'ready' &&
        (shares.shares.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('share.people.none')}
          </Text>
        ) : (
          <Stack gap={4} component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
            {shares.shares.map((share) => (
              <PersonRow key={share.userId} pathId={pathId} share={share} />
            ))}
          </Stack>
        ))}
      <Text size="xs" c="dimmed">
        {t('share.people.progressHint')}
      </Text>
    </Stack>
  );
}
