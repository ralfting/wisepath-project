'use client';

import { Badge, Box, Card, Container, Drawer, Grid, Group, Stack, Text, Title } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { MapList, MindMap, ViewSwitch } from '@/features/paths/map';
import { DRAWER_GAP, DRAWER_WIDTH } from '@/features/paths/page';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { publicMapHref } from '@/shared/routes';
import { ShareButton } from '@/ui/ShareButton/ShareButton';
import { StudyThisPath } from '../StudyThisPath/StudyThisPath';
import classes from './PublicPath.module.css';
import { PublicPage } from './PublicPage';
import { usePublicPath } from './usePublicPath';

/**
 * A public path as anyone with its link reads it. On a wide screen it opens on its map, a page chosen in it read in a
 * drawer beside; or, switched to the list, its pages in map order beside the one chosen. A phone has the list only.
 * Studying it adds it to the learner's paths with their own progress; it stays its owner's.
 */
export function PublicPath({ path }: { path: Path }) {
  const t = useT();
  const { state, refs, operations } = usePublicPath(path);
  const { view, page, wide, reading, focusRequest } = state;

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
          <Group justify="space-between" align="flex-start" w="100%">
            <Group gap="xs" align="flex-start">
              <ShareButton href={publicMapHref(path.id)} title={path.title} labels={{ share: t('share.open'), copied: t('share.link.copied') }} />
              <StudyThisPath pathId={path.id} readingHref={publicMapHref(path.id)} />
            </Group>
            <Box visibleFrom="sm">
              <ViewSwitch view={view} onChange={operations.setView} />
            </Box>
          </Group>
        </Stack>
        {/* A phone keeps to the list: the drawing needs more room than a phone has to be read */}
        {view === 'map' && (
          <Card className={classes.map} padding={0} radius="md" withBorder visibleFrom="sm">
            {wide && (
              <MindMap
                path={path}
                selectedId={reading ? page.id : null}
                currentId={null}
                progress={false}
                matchIds={null}
                focusRequest={focusRequest}
                coveredRight={reading ? DRAWER_WIDTH + DRAWER_GAP : 0}
                onSelect={(pageId) => operations.openInDrawer(pageId)}
                inScrollingPage
              />
            )}
          </Card>
        )}
        <Box hiddenFrom={view === 'map' ? 'sm' : undefined}>
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
                <PublicPage path={path} page={page} onOpen={operations.open} />
              </Card>
            </Grid.Col>
          </Grid>
        </Box>
      </Stack>
      {/* No overlay: the map stays usable beside it, and another page clicked there takes its place */}
      <Drawer.Root
        opened={reading}
        onClose={operations.closeDrawer}
        position="right"
        size={DRAWER_WIDTH}
        offset={DRAWER_GAP}
        radius="md"
        lockScroll={false}
        trapFocus={false}
      >
        <Drawer.Content ref={refs.drawer} shadow="xl" aria-labelledby="public-drawer-title">
          <Drawer.Header px="xl" pt="xl">
            <Drawer.Title id="public-drawer-title" fz="h3" fw={700}>
              {displayTitle(page)}
            </Drawer.Title>
            <Drawer.CloseButton aria-label={t('common.actions.close')} />
          </Drawer.Header>
          <Drawer.Body px="xl" pb="xl">
            <PublicPage path={path} page={page} onOpen={operations.openInDrawer} />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Container>
  );
}
