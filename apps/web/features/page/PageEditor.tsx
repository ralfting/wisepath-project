'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon, Anchor, Box, Card, Center, Group, Menu, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconBox, IconDotsVertical, IconSitemap, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Page, Project } from '@wisepath/domain/projects';
import { branchProgress, pathTo, projectProgress } from '@wisepath/domain/projects';
import { displayTitle } from '@/features/shared/title';
import type { ProjectActions, SaveState } from '@/useCases/projects';
import { useLocale, useT } from '@/i18n/I18nProvider';
import type { Translate } from '@/i18n/I18nProvider';
import { dateTime, relativeTime } from '@/i18n/dates';
import { SaveStatus } from '@/features/projects/SaveStatus';
import { ProjectGate } from '@/features/projects/ProjectGate';
import { AppFrame } from '@/features/shell/AppFrame';
import type { Crumb } from '@/features/shell/AppFrame';
import { mapHref, mapWithPageHref, pageHref as pageHrefOf } from '@/features/shared/routes';
import { PageContent, PageTitleInput } from './PageContent';
import type { PageActions } from './PageContent';
import type { EditorFocus } from '@/features/editor/MarkdownEditor';
import { DeletePageModal } from './DeletePageModal';
import { StudiedToggle } from './StudiedToggle';
import { PageLook, moduleLook } from './PageLook';
import classes from './PageEditor.module.css';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's panel, for longer writing.
 */
export function PageEditor({ projectId, pageId }: { projectId: string; pageId: string }) {
  return (
    <ProjectGate projectId={projectId}>
      {(project, store, save) => <EditorView project={project} store={store} save={save} pageId={pageId} />}
    </ProjectGate>
  );
}

function EditorView({ project, store, save, pageId }: { project: Project; store: ProjectActions; save: SaveState; pageId: string }) {
  const router = useRouter();
  const t = useT();
  const page = project.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const pageHref = (id: string) => pageHrefOf(project.id, id);

  if (!page) {
    return (
      <AppFrame crumbs={[{ label: t('page.crumbs.myPaths'), href: '/projects' }, { label: project.title, href: mapHref(project.id) }]}>
        <Center component="main" flex={1} p="md">
          <Stack gap="sm" align="center" maw={420} ta="center">
            <Title order={1} fz={30}>
              {t('page.notFound.title')}
            </Title>
            <Text c="dimmed">{t('page.notFound.body')}</Text>
            <Anchor component={Link} href={mapHref(project.id)} fw={700}>
              {t('page.notFound.backToMap')}
            </Anchor>
          </Stack>
        </Center>
      </AppFrame>
    );
  }

  return (
    <AppFrame crumbs={pageCrumbs(project, page, t)}>
      <PageSheet
        project={project}
        page={page}
        store={store}
        save={save}
        isFresh={isFresh}
        onOpenPage={(id) => router.push(pageHref(id))}
        showOnMap={{ href: mapWithPageHref(project.id, page.id) }}
        onDeleted={(back) => router.push(mapWithPageHref(project.id, back))}
      />
    </AppFrame>
  );
}

/** My paths › map › the pages the branch passes through › this page */
export function pageCrumbs(project: Project, page: Page, t: Translate): Crumb[] {
  const between = pathTo(project, page.id).slice(1, -1);
  return [
    { label: t('page.crumbs.myPaths'), href: '/projects' },
    { label: project.title, href: mapHref(project.id) },
    ...between.map((p) => ({ label: displayTitle(p), href: mapWithPageHref(project.id, p.id) })),
    ...(page.id === project.rootPageId ? [] : [{ label: displayTitle(page) }]),
  ];
}

interface PageSheetProps {
  project: Project;
  page: Page;
  store: ProjectActions;
  /** Whether the latest edits reached WisePath */
  save: SaveState;
  isFresh?: boolean;
  onOpenPage: (pageId: string) => void;
  /** The graph button: a link to the map, or (in the expanded drawer) going back to it */
  showOnMap: { href: string } | { onClick: () => void };
  /** After deleting, with the page it branched from */
  onDeleted: (backPageId: string) => void;
  /** The page this one was reached from, inside the drawer */
  back?: { page: Page; onClick: () => void };
  /** Puts the cursor in the text on open */
  focusEditor?: EditorFocus | null;
  onCursor?: (pos: number) => void;
}

/**
 * PageSheet
 * The full page: title first with its look, when it was edited, the studied
 * toggle, the way to the map and the delete menu, then the markdown. Shown by
 * the page route and by the map's drawer once expanded, so both are the same.
 */
export function PageSheet({
  project,
  page,
  store,
  save,
  isFresh = false,
  onOpenPage,
  showOnMap,
  onDeleted,
  back,
  focusEditor = null,
  onCursor,
}: PageSheetProps) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  const isRoot = page.id === project.rootPageId;
  const between = pathTo(project, page.id).slice(1, -1);

  const actions: PageActions = {
    updatePage: store.updatePage,
    beginRename: store.beginRename,
    renameLinks: store.renameLinks,
    openPage: onOpenPage,
    createLinkedPage: (title) => onOpenPage(store.createPage(title).id),
    createPage: (title) => void store.createPage(title),
  };

  return (
    <Card component="main" mx={{ base: 'md', sm: 'xl' }} mb="xl" padding="xl" className={classes.sheet}>
      <Group justify="space-between" align="center" wrap="nowrap" gap="lg" mb="lg" className={classes.header}>
        <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }}>
          {back && (
            <Tooltip label={t('page.back', { title: displayTitle(back.page) })}>
              <ActionIcon variant="subtle" color="gray" size="lg" onClick={back.onClick} aria-label={t('page.back', { title: displayTitle(back.page) })}>
                <IconArrowLeft size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <PageLook project={project} page={page} store={store} size={48} />
          <Box miw={0} style={{ flex: 1 }}>
            <PageTitleInput
              key={page.id}
              project={project}
              page={page}
              actions={store}
              size={34}
              autoFocus={isFresh}
              onEnter={() => setTextFocus((n) => n + 1)}
            />
          </Box>
        </Group>
        <Group gap="sm" wrap="nowrap">
          {save.status === 'saved' && !save.notice ? <SavedAt updatedAt={page.updatedAt} /> : <SaveStatus save={save} />}
          {/* A study has nothing to mark as studied */}
          {!isRoot && project.kind === 'learningPath' && (
            <StudiedToggle
              studied={page.studied}
              onChange={(studied) => store.updatePage(page.id, { studied })}
              progress={{ map: project.title, ...projectProgress(project) }}
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
          {!isRoot && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" size="lg" radius="md" aria-label={t('page.menu.more')}>
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconBox size={15} />} onClick={() => store.setLook(page.id, moduleLook(project, page, !page.module))}>
                  {t(page.module ? 'page.menu.showAsPage' : 'page.menu.showAsModule')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
                  {t('page.menu.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
      <DeletePageModal
        opened={confirmDelete}
        title={displayTitle(page)}
        orphansPages={(branchProgress(project, page.id)?.total ?? 0) > 0}
        onClose={() => setConfirmDelete(false)}
        onDelete={() => {
          // Leave first, so this page never renders as "not found" on the way out
          onDeleted(between.at(-1)?.id ?? project.rootPageId);
          store.deletePage(page.id);
        }}
      />
      <PageContent
        key={page.id}
        project={project}
        page={page}
        actions={actions}
        showTitle={false}
        toolbarOffset={0}
        focusEditor={focusEditor}
        onCursor={onCursor}
        focusSignal={textFocus}
      />
    </Card>
  );
}

/** When the page was last edited, once its edits are saved */
function SavedAt({ updatedAt }: { updatedAt: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [updatedAt]);
  if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) return null;
  return (
    <Tooltip label={t('page.savedAt.hint', { date: dateTime(updatedAt, locale) })}>
      <Text size="sm" c="dimmed" visibleFrom="md" style={{ whiteSpace: 'nowrap' }}>
        {t('page.savedAt.label', { when: relativeTime(updatedAt, now, locale) })}
      </Text>
    </Tooltip>
  );
}
