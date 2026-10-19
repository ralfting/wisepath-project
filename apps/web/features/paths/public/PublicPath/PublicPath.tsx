'use client';

import { Badge, Card, Container, Grid, Group, Stack, Text, Title } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { MarkdownEditor } from '@/features/paths/editor';
import { MapList } from '@/features/paths/map';
import { PagePager } from '@/features/paths/page';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { publicMapHref } from '@/shared/routes';
import { ShareButton } from '@/ui/ShareButton/ShareButton';
import { StudyThisPath } from '../StudyThisPath/StudyThisPath';
import { usePublicPath } from './usePublicPath';

const noop = () => {};

/**
 * A public path as anyone with its link reads it: its pages as a list in map order, and the one chosen, for reading
 * only, with the pages before and after it underneath. Studying it adds it to the learner's paths with their own
 * progress; it stays its owner's.
 */
export function PublicPath({ path }: { path: Path }) {
  const t = useT();
  const { state, refs, operations } = usePublicPath(path);
  const { page } = state;

  return (
    <Container component="main" size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="md" align="flex-start">
          <Stack gap={4} maw="100%">
            <Badge variant="light" w="fit-content">
              {t('share.public.badge')}
            </Badge>
            {/* A heading's full size wraps a long title over most of a phone's first screen */}
            <Title order={1} fz={{ base: 'h2', sm: 'h1' }} lh={{ base: 'h2', sm: 'h1' }}>
              {path.title}
            </Title>
            {path.description && <Text c="dimmed">{path.description}</Text>}
          </Stack>
          <Group gap="xs" align="flex-start">
            <ShareButton href={publicMapHref(path.id)} title={path.title} labels={{ share: t('share.open'), copied: t('share.link.copied') }} />
            <StudyThisPath pathId={path.id} readingHref={publicMapHref(path.id)} />
          </Group>
        </Stack>
        <Grid gutter="xl">
          {/* On a phone the page comes first and the list follows it, as its table of contents */}
          <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 2, md: 1 }}>
            <Card padding="md" radius="md" withBorder component="nav" aria-label={t('share.public.pages')}>
              <MapList path={path} selectedId={page.id} currentId={null} progress={false} matchIds={null} onSelect={operations.open} />
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 1, md: 2 }}>
            <Card ref={refs.article} p={{ base: 'md', sm: 'xl' }} radius="md" withBorder component="article" aria-labelledby="public-page-title">
              <Title order={2} fz={{ base: 'h3', sm: 'h2' }} mb="md" id="public-page-title">
                {displayTitle(page)}
              </Title>
              {page.content.trim() ? (
                <MarkdownEditor
                  key={page.id}
                  content={page.content}
                  onChange={noop}
                  pages={path.pages}
                  currentPageId={page.id}
                  onOpenPage={operations.open}
                  onLinkPage={noop}
                  onCreatePage={noop}
                  onCreatePageHere={noop}
                  readOnly
                />
              ) : (
                <Text c="dimmed">{t('share.public.empty')}</Text>
              )}
              <PagePager path={path} page={page} onOpen={operations.open} />
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
