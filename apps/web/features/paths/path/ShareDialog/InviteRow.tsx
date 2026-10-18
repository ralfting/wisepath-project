'use client';

import { useState } from 'react';
import { ActionIcon, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { MemberRole, PathInvite } from '@wisepath/domain/paths';
import { useCancelInvite, useSharePath } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { RoleSelect } from './RoleSelect';

/** An email the path waits for: it becomes theirs, with this access, when someone signs up with it */
export function InviteRow({ pathId, invite }: { pathId: string; invite: PathInvite }) {
  const t = useT();
  const reshare = useSharePath();
  const cancel = useCancelInvite();
  const [error, setError] = useState<string | null>(null);

  const handleRole = async (role: MemberRole) => {
    const result = await reshare(pathId, invite.email, role);
    setError(result.ok ? null : result.message);
  };

  return (
    <Stack component="li" gap={2}>
      <Group gap="sm" wrap="nowrap">
        <Stack gap={0} miw={0} style={{ flex: 1 }}>
          <Text size="sm" fw={600} truncate>
            {invite.email}
          </Text>
          <Text size="xs" c="dimmed">
            {t('share.people.waiting')}
          </Text>
        </Stack>
        <RoleSelect label={t('share.people.roleFor', { name: invite.email })} role={invite.role} onChange={(role) => void handleRole(role)} />
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t('share.people.cancel', { email: invite.email })}
          onClick={async () => setError(await cancel(pathId, invite.email))}
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
      {error && (
        <Text size="xs" c="red" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
