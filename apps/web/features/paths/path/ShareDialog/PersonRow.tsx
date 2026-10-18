'use client';

import { useState } from 'react';
import { ActionIcon, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { MemberRole, PathShare } from '@wisepath/domain/paths';
import { useSharePath, useUnsharePath } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { RoleSelect } from './RoleSelect';

/** Someone the path is shared with: who they are, their access (changed in place), and removing them */
export function PersonRow({ pathId, share }: { pathId: string; share: PathShare }) {
  const t = useT();
  const reshare = useSharePath();
  const unshare = useUnsharePath();
  const [error, setError] = useState<string | null>(null);
  const name = share.name ?? t('share.people.unnamed');

  const handleRole = async (role: MemberRole) => {
    const result = await reshare(pathId, share.email, role);
    setError(result.ok ? null : result.message);
  };

  return (
    <Stack component="li" gap={2}>
      <Group gap="sm" wrap="nowrap">
        <Stack gap={0} miw={0} style={{ flex: 1 }}>
          <Text size="sm" fw={600} truncate>
            {name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {share.email}
          </Text>
        </Stack>
        <RoleSelect label={t('share.people.roleFor', { name })} role={share.role} onChange={(role) => void handleRole(role)} />
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t('share.people.remove', { name })}
          onClick={async () => setError(await unshare(pathId, share.userId))}
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
