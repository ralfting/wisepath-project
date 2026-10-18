'use client';

import { Loader, Stack, Text } from '@mantine/core';
import { useShares } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { InviteRow } from './InviteRow';
import { PersonRow } from './PersonRow';
import { ShareForm } from './ShareForm';

/** Who the path is shared with, each with their access, the emails waiting for a sign up, and the form that adds someone */
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
        (shares.shared.people.length + shares.shared.invites.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('share.people.none')}
          </Text>
        ) : (
          <Stack gap={4} component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
            {shares.shared.people.map((share) => (
              <PersonRow key={share.userId} pathId={pathId} share={share} />
            ))}
            {shares.shared.invites.map((invite) => (
              <InviteRow key={invite.email} pathId={pathId} invite={invite} />
            ))}
          </Stack>
        ))}
      <Text size="xs" c="dimmed">
        {t('share.people.progressHint')}
      </Text>
    </Stack>
  );
}
