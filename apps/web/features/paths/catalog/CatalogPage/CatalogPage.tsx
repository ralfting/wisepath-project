import { Anchor, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { CatalogEntry, PathLanguage } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales';
import { catalogHref, exploreHref } from '@/shared/routes';
import classes from './CatalogPage.module.css';

interface CatalogPageProps {
  readonly entries: ReadonlyArray<CatalogEntry>;
  /** Only the paths in this language; all of them when null */
  readonly language: PathLanguage | null;
  readonly t: Translate;
}

/**
 * The catalog: a card for every published path, filtered by language through plain links, rendered on the server so
 * it reads without JavaScript and search engines reach every path from it
 */
export function CatalogPage({ entries, language, t }: CatalogPageProps) {
  const shown = language ? entries.filter((entry) => entry.language === language) : entries;
  const filters = [{ href: exploreHref(), label: t('catalog.explore.all'), on: language === null }].concat(
    LOCALES.map((option) => ({ href: exploreHref(option), label: LOCALE_NAMES[option], on: language === option })),
  );

  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t('catalog.explore.title')}</Title>
          <Text c="dimmed" maw={640}>
            {t('catalog.explore.intro')}
          </Text>
        </Stack>
        <Group component="nav" aria-label={t('catalog.explore.languages')} gap="xs">
          {filters.map((filter) => (
            <Anchor key={filter.href} href={filter.href} size="sm" className={classes.filter} data-on={filter.on || undefined} aria-current={filter.on ? 'page' : undefined}>
              {filter.label}
            </Anchor>
          ))}
        </Group>
        {shown.length === 0 ? (
          <Text c="dimmed">{t('catalog.explore.none')}</Text>
        ) : (
          <SimpleGrid component="ul" cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" className={classes.list}>
            {shown.map((entry) => (
              <li key={entry.slug}>
                <Paper withBorder radius="md" p="lg" h="100%" className={classes.card}>
                  <Stack gap="xs">
                    <Title order={2} size="h4">
                      <Anchor href={catalogHref(entry.slug)} inherit className={classes.cardLink}>
                        {entry.title}
                      </Anchor>
                    </Title>
                    {entry.description && <Text size="sm">{entry.description}</Text>}
                    {entry.audience && (
                      <Text size="sm" c="dimmed">
                        {t('catalog.for', { audience: entry.audience })}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {[entry.language ? LOCALE_NAMES[entry.language] : null, t('catalog.explore.pages', { count: entry.pages.length + 1 })]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Stack>
                </Paper>
              </li>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
