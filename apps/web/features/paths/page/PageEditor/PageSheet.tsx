'use client';

import { ActionIcon, Box, Card, Group, Menu, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconBox, IconDotsVertical, IconSitemap, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { branchProgress, canEdit, pathProgress } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { useT } from '@/i18n/I18nProvider';
import { SaveStatus } from '@/features/paths/path';
import { PageContent } from '../PageContent/PageContent';
import { PageTitleInput } from '../PageContent/PageTitleInput';
import { DeletePageModal } from '../DeletePageModal';
import { StudiedToggle } from '../StudiedToggle';
import { PageLook } from '../PageLook/PageLook';
import { moduleLook } from '../PageLook/PageLook.helpers';
import classes from './PageEditor.module.css';
import { SavedAt } from './SavedAt';
import type { PageSheetProps } from './PageEditor.helpers';
import { usePageSheet } from './usePageSheet';

/**
 * The full page: title first with its look, when it was edited, the studied
 * toggle, the way to the map and the delete menu, then the markdown. Shown by
 * the page route and by the map's drawer once expanded, so both are the same.
 */
export function PageSheet({
  path,
  page,
  store,
  save,
  onOpenPage,
  showOnMap,
  onDeleted,
  back,
  focusEditor = null,
  onCursor,
}: PageSheetProps) {
  const t = useT();
  const { state, operations } = usePageSheet({ path, page, store, onOpenPage });
  const { isRoot, between } = state;

  return (
    <Card component="main" mb="xl" padding="lg" className={classes.sheet}>
      {/* One compact line: the page is its text, and the title should not push it down */}
      <Group justify="space-between" align="center" wrap="nowrap" gap="md" mb="sm" className={classes.header}>
        <Group gap="sm" wrap="nowrap" align="center" miw={0} className={classes.titleRow}>
          {back && (
            <Tooltip label={t('page.back', { title: displayTitle(back.page) })}>
              <ActionIcon variant="subtle" color="gray" size="lg" onClick={back.onClick} aria-label={t('page.back', { title: displayTitle(back.page) })}>
                <IconArrowLeft size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <PageLook path={path} page={page} store={store} size={32} />
          <Box miw={0} style={{ flex: 1 }}>
            <PageTitleInput
              key={page.id}
              path={path}
              page={page}
              actions={store}
              size={26}
              onEnter={operations.focusText}
            />
          </Box>
        </Group>
        <Group gap="sm" wrap="nowrap" className={classes.headerActions}>
          {save.status === 'saved' && !save.notice ? <SavedAt updatedAt={page.updatedAt} /> : <SaveStatus save={save} />}
          {/* A study has nothing to mark as studied */}
          {path.kind === 'learningPath' && (
            <StudiedToggle
              studied={page.studied}
              onChange={(studied) => store.updatePage(page.id, { studied })}
              progress={{ map: path.title, ...pathProgress(path) }}
            />
          )}
          <Tooltip label={t('page.seeOnMap')}>
            {'href' in showOnMap ? (
              <ActionIcon component={Link} href={showOnMap.href} variant="default" size="lg" radius="md" aria-label={t('page.seeOnMap')}>
                <IconSitemap size={18} />
              </ActionIcon>
            ) : (
              <ActionIcon onClick={showOnMap.onClick} variant="default" size="lg" radius="md" aria-label={t('page.seeOnMap')}>
                <IconSitemap size={18} />
              </ActionIcon>
            )}
          </Tooltip>
          {!isRoot && canEdit(path.access) && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" size="lg" radius="md" aria-label={t('page.menu.more')}>
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconBox size={15} />} onClick={() => store.setLook(page.id, moduleLook(path, page, !page.module))}>
                  {t(page.module ? 'page.menu.showAsPage' : 'page.menu.showAsModule')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={operations.confirmDelete}>
                  {t('page.menu.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
      <DeletePageModal
        opened={state.confirmingDelete}
        title={displayTitle(page)}
        orphansPages={(branchProgress(path, page.id)?.total ?? 0) > 0}
        onClose={operations.cancelDelete}
        onDelete={() => {
          // Leave first, so this page never renders as "not found" on the way out
          onDeleted(between.at(-1)?.id ?? path.rootPageId);
          store.deletePage(page.id);
        }}
      />
      <PageContent
        key={page.id}
        path={path}
        page={page}
        actions={state.actions}
        showTitle={false}
        toolbarOffset={0}
        focusEditor={focusEditor}
        onCursor={onCursor}
        focusSignal={state.textFocus}
      />
    </Card>
  );
}
