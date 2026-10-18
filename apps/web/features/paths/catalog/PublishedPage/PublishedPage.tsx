import { Anchor, Badge, Box, Breadcrumbs, Container, Flex, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { neighbours, relatedPages, trailTo } from '@wisepath/domain/paths';
import type { Page, Path, Relation } from '@wisepath/domain/paths';
import type { Translate, TranslationKey } from '@/i18n/I18nProvider';
import { displayTitle } from '@/i18n/title';
import { StudyThisPath } from '@/features/paths/public';
import { MarkdownText } from '../MarkdownText/MarkdownText';
import { hrefsOf, outline } from './PublishedPage.helpers';
import classes from './PublishedPage.module.css';

/** How a related page relates, in the words the page panel uses */
const RELATION: Record<Relation, TranslationKey> = {
  parent: 'page.related.parent.label',
  child: 'page.related.child.label',
  linksTo: 'page.related.linksTo.label',
  linkedFrom: 'page.related.linkedFrom.label',
};

interface PublishedPageProps {
  readonly path: Path;
  readonly pathSlug: string;
  readonly page: Page;
  readonly t: Translate;
}

/**
 * One page of a published path, as anyone reads it in the catalog: rendered on the server, its text and every way
 * on (its trail, related pages, the path's pages) as plain links, so it reads without JavaScript
 */
export function PublishedPage({ path, pathSlug, page, t }: PublishedPageProps) {
  const { hrefOf, hrefOfTitle } = hrefsOf(path, pathSlug);
  const isRoot = page.id === path.rootPageId;
  const trail = trailTo(path, page.id);
  const related = relatedPages(path, page.id);
  const { previous, next } = neighbours(path, page.id);

  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4} miw={0} style={{ flex: 1 }}>
            <Badge variant="light" w="fit-content">
              {t('catalog.badge')}
            </Badge>
            {isRoot ? null : (
              <Anchor href={hrefOf({ id: path.rootPageId })} fw={700}>
                {path.title}
              </Anchor>
            )}
            {path.description && <Text c="dimmed">{path.description}</Text>}
            {path.audience && (
              <Text size="sm" c="dimmed">
                {t('catalog.for', { audience: path.audience })}
              </Text>
            )}
          </Stack>
          <StudyThisPath pathId={path.id} readingHref={hrefOf(page)} />
        </Group>

        <Flex direction={{ base: 'column', md: 'row' }} gap="xl" align="flex-start">
          <Paper component="article" withBorder radius="md" p="xl" className={classes.article} lang={path.language}>
            {trail.length > 1 && (
              <Breadcrumbs aria-label={t('catalog.trail')} mb="sm" separatorMargin={6}>
                {trail.slice(0, -1).map((step) => (
                  <Anchor key={step.id} href={hrefOf(step)} size="sm">
                    {displayTitle(step)}
                  </Anchor>
                ))}
              </Breadcrumbs>
            )}
            <Title order={1} mb="md">
              {displayTitle(page)}
            </Title>
            {page.content.trim() ? <MarkdownText content={page.content} hrefOf={hrefOfTitle} /> : <Text c="dimmed">{t('catalog.empty')}</Text>}
            {(previous || next) && (
              <Group component="nav" aria-label={t('catalog.pager')} justify="space-between" align="flex-start" mt="xl" pt="md" className={classes.pager}>
                {previous ? (
                  <Anchor href={hrefOf(previous)} rel="prev">
                    <Text span size="xs" c="dimmed" display="block">
                      ← {t('catalog.previous')}
                    </Text>
                    {displayTitle(previous)}
                  </Anchor>
                ) : (
                  <span />
                )}
                {next && (
                  <Anchor href={hrefOf(next)} rel="next" ta="right">
                    <Text span size="xs" c="dimmed" display="block">
                      {t('catalog.next')} →
                    </Text>
                    {displayTitle(next)}
                  </Anchor>
                )}
              </Group>
            )}
          </Paper>

          <Stack gap="lg" w={{ base: '100%', md: 280 }}>
            {related.length > 0 && (
              <Box component="nav" aria-labelledby="catalog-related">
                <Title order={2} size="h5" mb="xs" id="catalog-related">
                  {t('catalog.related')}
                </Title>
                <Stack component="ul" gap={4} className={classes.list}>
                  {related.map(({ page: other, relation }) => (
                    <li key={other.id}>
                      <Anchor href={hrefOf(other)} size="sm">
                        {displayTitle(other)}
                      </Anchor>{' '}
                      <Text span size="xs" c="dimmed">
                        {t(RELATION[relation])}
                      </Text>
                    </li>
                  ))}
                </Stack>
              </Box>
            )}
            <Box component="nav" aria-labelledby="catalog-pages">
              <Title order={2} size="h5" mb="xs" id="catalog-pages">
                {t('catalog.pages')}
              </Title>
              <Stack component="ul" gap={4} className={classes.list}>
                {outline(path).map(({ page: entry, depth }) => (
                  <Box component="li" key={entry.id} pl={`calc(${depth} * var(--mantine-spacing-sm))`}>
                    <Anchor href={hrefOf(entry)} size="sm" fw={entry.id === page.id ? 700 : undefined} aria-current={entry.id === page.id ? 'page' : undefined}>
                      {displayTitle(entry)}
                    </Anchor>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Flex>
      </Stack>
    </Container>
  );
}
