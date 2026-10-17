'use client';

import Link from 'next/link';
import { Alert, Badge, Button, Card, Container, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import type { Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { MapList } from '@/features/paths/map';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { usePublicPath } from './usePublicPath';

const noop = () => {};

/**
 * A public path as anyone with its link reads it: its pages as a list in map order, and the one chosen, for reading
 * only. Studying it adds it to the learner's paths with their own progress; it stays its owner's.
 */
export function PublicPath({ path }: { path: Path }) {
  const t = useT();
  const { state, operations } = usePublicPath(path);
  const { page } = state;

  return (
    <Container component="main" size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4} miw={0} style={{ flex: 1 }}>
            <Badge variant="light" w="fit-content">
              {t('share.public.badge')}
            </Badge>
            <Title order={1}>
              {path.title}
            </Title>
            {path.description && <Text c="dimmed">{path.description}</Text>}
          </Stack>
          <Stack gap={4} align="flex-end">
            {state.signedIn ? (
              <Button leftSection={<IconPlayerPlayFilled size={14} />} loading={state.busy} onClick={() => void operations.study()}>
                {t('share.public.study')}
              </Button>
            ) : (
              <Group gap="sm">
                <Button component={Link} href="/signup" variant="default">
                  {t('share.public.signUp')}
                </Button>
                <Button component={Link} href={state.loginHref}>
                  {t('share.public.logIn')}
                </Button>
              </Group>
            )}
            <Text size="xs" c="dimmed">
              {t('share.public.studyHint')}
            </Text>
          </Stack>
        </Group>
        {state.error && (
          <Alert color="red" role="alert">
            {state.error}
          </Alert>
        )}
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card padding="md" radius="md" withBorder component="nav" aria-label={t('share.public.pages')}>
              <MapList path={path} selectedId={page.id} currentId={null} progress={false} matchIds={null} onSelect={operations.select} />
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card padding="xl" radius="md" withBorder component="article" aria-labelledby="public-page-title">
              <Title order={2} mb="md" id="public-page-title">
                {displayTitle(page)}
              </Title>
              {page.content.trim() ? (
                <MarkdownEditor
                  key={page.id}
                  content={page.content}
                  onChange={noop}
                  pages={path.pages}
                  currentPageId={page.id}
                  onOpenPage={operations.select}
                  onLinkPage={noop}
                  onCreatePage={noop}
                  onCreatePageHere={noop}
                  readOnly
                />
              ) : (
                <Text c="dimmed">{t('share.public.empty')}</Text>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
