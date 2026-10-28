'use client';

import { Avatar, Text, Tooltip } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import type { PathAccess } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';

interface PathOwnerProps {
  /** Absent when the owner has no name, or the reader may not be told it */
  readonly name: string | null | undefined;
  readonly access: PathAccess;
  readonly size: number;
}

/** The owner of a path from others, as an avatar that says whose path it is and what the reader may do with it */
export function PathOwner({ name, access, size }: PathOwnerProps) {
  const t = useT();
  const whose = name ? t('share.owner.of', { name }) : t('share.owner.someone');
  const can = t(access === 'editor' ? 'share.owner.editor' : 'share.owner.viewer');
  const label = (
    <>
      <Text inherit fw={700}>
        {whose}
      </Text>
      <Text inherit>{can}</Text>
    </>
  );

  return (
    <Tooltip label={label} events={{ hover: true, focus: true, touch: true }} withArrow multiline>
      <Avatar
        name={name ?? undefined}
        // The same person gets the same colour on every card and map
        color={name ? 'initials' : 'gray'}
        variant="filled"
        radius="xl"
        size={size}
        tabIndex={0}
        role="img"
        aria-label={t('share.owner.label', { whose, can })}
      >
        {!name && <IconUser size="60%" />}
      </Avatar>
    </Tooltip>
  );
}
