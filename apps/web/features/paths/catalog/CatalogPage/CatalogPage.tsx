import { Anchor, Button, Container, Group, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { CatalogEntry, PathLanguage } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales';
import { catalogHref, exploreHref } from '@/shared/routes';
import classes from './CatalogPage.module.css';

/** Cards on one page of results: a few rows on a wide screen, and a short scroll on a phone */
const PAGE_SIZE = 24;

interface CatalogPageProps {
  /** The published paths the search and the language asked for, already narrowed by the API */
  readonly entries: ReadonlyArray<CatalogEntry>;
  readonly q: string | null;
  readonly language: PathLanguage | null;
  /** The page of results asked for, from 1; past the last, the last */
  readonly page: number;
  readonly t: Translate;
}

/**
 * The catalog: a search, a language filter and a card for every published path, a page of results at a time. All of
 * it is plain links and a plain form, rendered on the server, so it works without JavaScript, a search can be shared
 * by its address, and search engines reach every path from it.
 */
export function CatalogPage({ entries, q, language, page, t }: CatalogPageProps) {
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const shown = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filters = [{ href: exploreHref({ q }), label: t('catalog.explore.all'), on: language === null }].concat(
    LOCALES.map((option) => ({ href: exploreHref({ q, lang: option }), label: LOCALE_NAMES[option], on: language === option })),
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
        <form action="/explore" method="get" role="search">
          <Group gap="xs" align="flex-end" wrap="nowrap" maw={640}>
            <TextInput
              name="q"
              type="search"
              defaultValue={q ?? ''}
              aria-label={t('catalog.explore.search')}
              placeholder={t('catalog.explore.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              className={classes.search}
            />
            {/* The language in view stays chosen for the next search */}
            {language && <input type="hidden" name="lang" value={language} />}
            <Button type="submit">{t('catalog.explore.searchSubmit')}</Button>
          </Group>
        </form>
        <Group justify="space-between" align="center" gap="sm">
          <Group component="nav" aria-label={t('catalog.explore.languages')} gap="xs">
            {filters.map((filter) => (
              <Anchor key={filter.href} href={filter.href} size="sm" className={classes.filter} data-on={filter.on || undefined} aria-current={filter.on ? 'page' : undefined}>
                {filter.label}
              </Anchor>
            ))}
          </Group>
          <Text size="sm" c="dimmed" role="status">
            {t('catalog.explore.found', { count: entries.length })}
          </Text>
        </Group>
        {shown.length === 0 ? (
          <Text c="dimmed">{q ? t('catalog.explore.noneFound', { q }) : t('catalog.explore.none')}</Text>
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
        {pages > 1 && (
          <Group component="nav" aria-label={t('catalog.explore.results')} justify="center" gap="md">
            {current > 1 && (
              <Anchor href={exploreHref({ q, lang: language, page: current - 1 })} rel="prev">
                ← {t('catalog.explore.previousPage')}
              </Anchor>
            )}
            <Text size="sm" c="dimmed">
              {t('catalog.explore.pageOf', { page: current, pages })}
            </Text>
            {current < pages && (
              <Anchor href={exploreHref({ q, lang: language, page: current + 1 })} rel="next">
                {t('catalog.explore.nextPage')} →
              </Anchor>
            )}
          </Group>
        )}
      </Stack>
    </Container>
  );
}
