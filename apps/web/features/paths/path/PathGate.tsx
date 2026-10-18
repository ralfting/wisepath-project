'use client';

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Center, Stack, Text, Title } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { usePath } from '@/useCases/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { ReadingLoader } from '@/ui/ReadingLoader/ReadingLoader';

/**
 * PathGate
 * Loads a path and renders its children only once it is ready:
 * a small reader while loading (past half a second), the not-found page for an unknown id (or someone
 * else's map), a short message when the API can't be reached.
 */
export function PathGate({
  pathId,
  children,
}: {
  pathId: string;
  children: (path: Path, actions: PathActions, save: SaveState) => ReactNode;
}) {
  const { state, save, actions } = usePath(pathId);
  const t = useT();

  if (state.status === 'loading') return <ReadingLoader label={t('home.gate.loading')} />;
  if (state.status === 'notFound') notFound();
  if (state.status === 'unavailable') {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="sm" align="center" maw={420} ta="center">
          <Title order={1} fz={30}>
            {t('home.gate.title')}
          </Title>
          <Text c="dimmed">{t('home.gate.body')}</Text>
        </Stack>
      </Center>
    );
  }
  return <>{children(state.path, actions, save)}</>;
}
