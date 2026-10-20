'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import type { Path } from '@wisepath/domain/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { AppFrame } from '@/features/shell';
import { mapHref, mapWithPageHref, pageHref as pageHrefOf, showFullPage } from '@/shared/routes';
import { pageCrumbs } from './PageEditor.helpers';
import { PageSheet } from './PageSheet';
import { RememberOpened } from './RememberOpened';

/** A loaded page as a full page: its crumbs, save status and editor, or not-found when the page is gone */
export function EditorView({ path, store, save, pageId }: { path: Path; store: PathActions; save: SaveState; pageId: string }) {
  const router = useRouter();
  const t = useT();
  const page = path.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const pageHref = (id: string) => pageHrefOf(path.id, id);

  if (!page) {
    return (
      <AppFrame crumbs={[{ label: t('page.crumbs.myPaths'), href: '/paths' }, { label: path.title, href: mapHref(path.id) }]}>
        <Center component="main" flex={1} p="md">
          <Stack gap="sm" align="center" maw={420} ta="center">
            <Title order={1} fz={30}>
              {t('page.notFound.title')}
            </Title>
            <Text c="dimmed">{t('page.notFound.body')}</Text>
            <Anchor component={Link} href={mapHref(path.id)} fw={700}>
              {t('page.notFound.backToMap')}
            </Anchor>
          </Stack>
        </Center>
      </AppFrame>
    );
  }

  return (
    <AppFrame crumbs={pageCrumbs(path, page, t)}>
      <RememberOpened path={path} page={page} />
      <PageSheet
        path={path}
        page={page}
        store={store}
        save={save}
        // Just made (?new=1): at the end of the text, to write in it; else at its start
        focusEditor={isFresh ? 'end' : 'start'}
        // Another page opens as a full page too; with Cmd/Ctrl, on the map in its drawer
        onOpenPage={(id, alternate) => (alternate ? router.push(mapWithPageHref(path.id, id)) : showFullPage(pageHref(id)))}
        showOnMap={{ href: mapWithPageHref(path.id, page.id) }}
        onDeleted={(back) => router.push(mapWithPageHref(path.id, back))}
      />
    </AppFrame>
  );
}
