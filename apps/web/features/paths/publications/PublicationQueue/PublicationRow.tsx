'use client';

import { Anchor, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { PendingPublication } from '@wisepath/domain/paths';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { relativeTime } from '@/i18n/dates';
import { LOCALE_NAMES } from '@/i18n/locales';
import { publicMapHref } from '@/shared/routes';
import { usePublicationRow } from './usePublicationRow';

/** One request: what the path is, who asked, a link to read it, and the decision */
export function PublicationRow({ request, now }: { request: PendingPublication; now: number }) {
  const t = useT();
  const { locale } = useLocale();
  const { state, operations } = usePublicationRow(request.pathId);
  const owner = request.ownerName ?? request.ownerEmail;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {request.title}
        </Title>
        <Text size="sm">{request.description}</Text>
        <Text size="sm" c="dimmed">
          {t('admin.publications.for', { audience: request.audience })} ·{' '}
          {t('admin.publications.language', { language: LOCALE_NAMES[request.language] })} ·{' '}
          {t('admin.publications.pages', { count: request.pages })}
        </Text>
        <Text size="sm" c="dimmed">
          {t('admin.publications.by', { name: owner })} ·{' '}
          {t('admin.publications.askedOn', { date: relativeTime(request.requestedAt, now, locale) })}
        </Text>
        <Group gap="xs" mt="xs">
          <Anchor href={publicMapHref(request.pathId)} target="_blank" rel="noopener noreferrer" size="sm">
            {t('admin.publications.read')}
          </Anchor>
          <Group gap="xs" ml="auto">
            <Button variant="default" size="xs" loading={state.busy === 'decline'} disabled={state.busy !== null} onClick={() => void operations.decline()}>
              {t('admin.publications.decline')}
            </Button>
            <Button size="xs" loading={state.busy === 'approve'} disabled={state.busy !== null} onClick={() => void operations.approve()}>
              {t('admin.publications.approve')}
            </Button>
          </Group>
        </Group>
        {state.error && (
          <Text size="sm" c="red" role="alert">
            {state.error}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
