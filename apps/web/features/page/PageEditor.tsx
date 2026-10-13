'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon, Anchor, Box, Card, Center, Group, Menu, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconBox, IconDotsVertical, IconSitemap, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Page, Project } from '@wisepath/domain/projects';
import { branchProgress, displayTitle, pathTo, projectProgress } from '@wisepath/domain/projects';
import type { ProjectActions, SaveState } from '@/useCases/projects';
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
  const page = project.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const pageHref = (id: string) => pageHrefOf(project.id, id);

  if (!page) {
    return (
      <AppFrame crumbs={[{ label: 'My paths', href: '/projects' }, { label: project.title, href: mapHref(project.id) }]}>
        <Center component="main" flex={1} p="md">
          <Stack gap="sm" align="center" maw={420} ta="center">
            <Title order={1} fz={30}>
              Page not found
            </Title>
            <Text c="dimmed">It may have been deleted. The rest of the path is still there.</Text>
            <Anchor component={Link} href={mapHref(project.id)} fw={700}>
              Back to the map
            </Anchor>
          </Stack>
        </Center>
      </AppFrame>
    );
  }

  return (
    <AppFrame crumbs={pageCrumbs(project, page)}>
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
export function pageCrumbs(project: Project, page: Page): Crumb[] {
  const between = pathTo(project, page.id).slice(1, -1);
  return [
    { label: 'My paths', href: '/projects' },
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  const isRoot = page.id === project.rootPageId;
  const between = pathTo(project, page.id).slice(1, -1);

  const actions: PageActions = {
    updatePage: store.updatePage,
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
            <Tooltip label={`Back to ${displayTitle(back.page)}`}>
              <ActionIcon variant="subtle" color="gray" size="lg" onClick={back.onClick} aria-label={`Back to ${displayTitle(back.page)}`}>
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
          {!isRoot && (
            <StudiedToggle
              studied={page.studied}
              onChange={(studied) => store.updatePage(page.id, { studied })}
              progress={{ map: project.title, ...projectProgress(project) }}
            />
          )}
          <Tooltip label="See it on the map">
            {'href' in showOnMap ? (
              <ActionIcon component={Link} href={showOnMap.href} variant="default" size="lg" radius="md" aria-label="See it on the map">
                <IconSitemap size={18} />
              </ActionIcon>
            ) : (
              <ActionIcon onClick={showOnMap.onClick} variant="default" size="lg" radius="md" aria-label="See it on the map">
                <IconSitemap size={18} />
              </ActionIcon>
            )}
          </Tooltip>
          {!isRoot && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" size="lg" radius="md" aria-label="More">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconBox size={15} />} onClick={() => store.setLook(page.id, moduleLook(project, page, !page.module))}>
                  {page.module ? 'Show as a page' : 'Show as a module'}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
                  Delete page
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

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
];

/** "3 minutes ago" from an ISO date */
function ago(iso: string, now: number): string {
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size || unit === 'year') return relative.format(Math.round(value), unit);
    value /= size;
  }
  return '';
}

/** When the page was last edited, once its edits are saved */
function SavedAt({ updatedAt }: { updatedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [updatedAt]);
  if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) return null;
  return (
    <Tooltip label={`Saved · ${new Date(updatedAt).toLocaleString()}`}>
      <Text size="sm" c="dimmed" visibleFrom="md" style={{ whiteSpace: 'nowrap' }}>
        Saved · edited {ago(updatedAt, now)}
      </Text>
    </Tooltip>
  );
}
