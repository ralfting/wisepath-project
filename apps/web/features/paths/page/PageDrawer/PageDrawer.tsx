'use client';

import { useRouter } from 'next/navigation';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { PathGate } from '@/features/paths/path';
import { pageHref } from '@/shared/routes';
import { PagePanel } from '../PagePanel/PagePanel';
import { pageCrumbs } from '../PageEditor/PageEditor.helpers';
import { PageSheet } from '../PageEditor/PageSheet';
import { CrumbTrail, TopBar } from '@/features/shell';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageDrawer.module.css';
import { usePageDrawer } from './usePageDrawer';

/**
 * A page opened from the map, in a drawer over it. The URL is the page's own
 * (/paths/:id/pages/:pageId), so back closes it and a reload shows the full
 * page; the expand button grows the drawer to the whole window in place. The map behind stays usable: clicking another
 * page switches the drawer to it.
 */
export function PageDrawer({ pathId, pageId: routePageId }: { pathId: string; pageId: string }) {
  const router = useRouter();
  const t = useT();
  const { controls, state, operations } = usePageDrawer({ pathId, routePageId });
  const { close, expanded, toggleExpanded } = controls;
  const { pageId, before, swapped, cursor } = state;
  const { go, goBack } = operations;

  return (
    <PathGate pathId={pathId}>
      {(path, store, save) => {
        const page = path.pages.find((p) => p.id === pageId);
        // The page to go back to, skipping any deleted on the way
        const backIndex = before.map((id) => path.pages.some((p) => p.id === id)).lastIndexOf(true);
        const back = backIndex < 0 ? undefined : path.pages.find((p) => p.id === before[backIndex]);
        if (!page) {
          return (
            <Stack gap="sm" p="xl">
              <Title order={2} fz={22}>
                {t('page.notFound.title')}
              </Title>
              <Text c="dimmed">{t('page.notFound.body')}</Text>
              <Anchor component="button" type="button" onClick={close} fw={700} ta="left">
                {t('common.actions.close')}
              </Anchor>
            </Stack>
          );
        }
        // Expanded: the full page itself (top bar and sheet), not a stretched panel
        if (expanded) {
          return (
            <div className={classes.expanded}>
              <TopBar>
                <CrumbTrail crumbs={pageCrumbs(path, page, t)} />
              </TopBar>
              <PageSheet
                path={path}
                page={page}
                store={store}
                save={save}
                onOpenPage={go}
                back={back && { page: back, onClick: () => goBack(back.id, before.slice(0, backIndex)) }}
                focusEditor={cursor}
                onCursor={(pos) => operations.rememberCursor(page.id, pos)}
                showOnMap={{ onClick: toggleExpanded }}
                onDeleted={(back) => {
                  toggleExpanded();
                  router.replace(pageHref(path.id, back), { scroll: false });
                }}
              />
            </div>
          );
        }
        return (
          // Keyed by the page: another page slides in, so the change is seen
          <div key={page.id} className={classes.swap} data-swapped={swapped || undefined}>
          <PagePanel
            path={path}
            page={page}
            store={store}
            save={save}
            onSelect={go}
            focusEditor={cursor}
            onCursor={(pos) => operations.rememberCursor(page.id, pos)}
            back={back && { page: back, onClick: () => goBack(back.id, before.slice(0, backIndex)) }}
            onExpand={toggleExpanded}
            onClose={close}
            flat
          />
          </div>
        );
      }}
    </PathGate>
  );
}
