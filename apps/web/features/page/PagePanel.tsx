'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Card,
  Group,
  Menu,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpLeft,
  IconArrowsDiagonal,
  IconBox,
  IconChevronRight,
  IconDotsVertical,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Page, Project, Relation } from '@wisepath/domain/projects';
import {
  branchProgress,
  displayTitle,
  lookOf,
  mapTree,
  pathTo,
  projectProgress,
  relatedPages,
} from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { PageGlyph } from '@/features/shared/look';
import { PageContent, PageTitleInput } from './PageContent';
import type { EditorFocus } from '@/features/editor/MarkdownEditor';
import type { PageActions } from './PageContent';
import { DeletePageModal } from './DeletePageModal';
import { StudiedToggle } from './StudiedToggle';
import { PageLook, moduleLook } from './PageLook';
import classes from './PagePanel.module.css';

/**
 * PagePanel
 * The selected page beside the map: where it sits, its title and markdown,
 * the pages related to it, and how it shows on the map.
 */

interface PagePanelProps {
  project: Project;
  page: Page;
  store: ProjectActions;
  onSelect: (pageId: string) => void;
  /** Grows the drawer into the full page, in place */
  onExpand?: () => void;
  onClose?: () => void;
  /** Without the card frame, inside the drawer */
  flat?: boolean;
  /** The page this one was reached from, inside the drawer */
  back?: { page: Page; onClick: () => void };
  /** Puts the cursor in the text on open: at a position, its start or its end */
  focusEditor?: EditorFocus | null;
  /** Puts the focus on the title on open instead */
  focusTitle?: boolean;
  /** Follows the cursor in the text */
  onCursor?: (pos: number) => void;
}

type PanelTab = 'content' | 'related';

/**
 * The related pages, grouped by how they connect, in a fixed order: up the
 * branch, down it, then [[links]] out and in. Each arrow reads from this page,
 * so a section says its direction once instead of every row repeating it.
 */
const RELATION_SECTIONS: ReadonlyArray<{ relation: Relation; label: string; hint: string; icon: Icon }> = [
  { relation: 'parent', label: 'Branches from', hint: 'The page this one grows out of on the map', icon: IconArrowUpLeft },
  { relation: 'child', label: 'Branches into', hint: 'Pages that grow out of this one on the map', icon: IconArrowDownRight },
  { relation: 'linksTo', label: 'Links to', hint: 'Pages this page mentions with [[ ]]', icon: IconArrowRight },
  { relation: 'linkedFrom', label: 'Linked from', hint: 'Pages that mention this one with [[ ]]', icon: IconArrowLeft },
];

export function PagePanel({ project, page, store, onSelect, onExpand, onClose, flat = false, back, focusEditor = null, focusTitle = false, onCursor }: PagePanelProps) {
  const [tab, setTab] = useState<PanelTab>('content');
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRoot = page.id === project.rootPageId;
  const tree = mapTree(project);
  const isOrphan = !tree.nodes.has(page.id);
  const path = pathTo(project, page.id, tree);
  const related = relatedPages(project, page.id);
  const below = branchProgress(project, page.id);
  const branchFrom = path.length > 1 ? path[path.length - 2] : null;

  const pageActions: PageActions = {
    updatePage: store.updatePage,
    beginRename: store.beginRename,
    renameLinks: store.renameLinks,
    openPage: onSelect,
    createLinkedPage: (title) => onSelect(store.createPage(title).id),
    createPage: (title) => void store.createPage(title),
  };

  const kind = isRoot ? 'The path' : isOrphan ? 'Orphan: no link reaches this page' : page.module ? 'Module' : 'Page';
  const subtitle = below && below.total > 0 ? `${kind} · ${below.studied} of ${below.total} below studied` : kind;

  return (
    <Card
      padding={0}
      className={`${classes.panel} ${flat ? classes.flat : ''}`}
      aria-label="Selected page"
      component="aside"
    >
      <Group justify="space-between" wrap="nowrap" px="lg" pt="md" gap="xs">
        <Group gap={4} wrap="nowrap" miw={0}>
        {back && (
          <Tooltip label={`Back to ${displayTitle(back.page)}`}>
            <ActionIcon variant="subtle" color="gray" onClick={back.onClick} aria-label={`Back to ${displayTitle(back.page)}`}>
              <IconArrowLeft size={17} />
            </ActionIcon>
          </Tooltip>
        )}
        {/* Where the page sits; its own title is right below, so the trail stops at its parent */}
        <Breadcrumbs separator={<IconChevronRight size={14} />} className={classes.trail} aria-label="Path to this page">
          {isRoot ? (
            <Text size="sm" fw={600}>
              Centre of the path
            </Text>
          ) : isOrphan ? (
            <Text size="sm" c="dimmed">
              Orphans
            </Text>
          ) : (
            trailOf(path.slice(0, -1)).map((p) =>
              p === null ? (
                <Text key="gap" size="sm" c="dimmed" aria-label="More pages">
                  …
                </Text>
              ) : (
                <Anchor key={p.id} component="button" type="button" size="sm" c="dimmed" onClick={() => onSelect(p.id)} truncate maw={160}>
                  {displayTitle(p)}
                </Anchor>
              ),
            )
          )}
        </Breadcrumbs>
        </Group>
        <Group gap={2} wrap="nowrap">
          {onExpand && (
            <Tooltip label="Open as a full page">
              <ActionIcon variant="subtle" color="gray" onClick={onExpand} aria-label="Expand">
                <IconArrowsDiagonal size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          {!isRoot && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label="More">
                  <IconDotsVertical size={17} />
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
          {onClose && (
            <Tooltip label="Close (Esc)">
              <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Close page">
                <IconX size={17} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      <DeletePageModal
        opened={confirmDelete}
        title={displayTitle(page)}
        orphansPages={!!below && below.total > 0}
        onClose={() => setConfirmDelete(false)}
        onDelete={() => {
          setConfirmDelete(false);
          store.deletePage(page.id);
          onSelect(branchFrom?.id ?? project.rootPageId);
        }}
      />

      <Group gap="md" wrap="nowrap" align="flex-start" px="lg" pt="md">
        <PageLook project={project} page={page} store={store} size={60} />
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <PageTitleInput
            key={page.id}
            project={project}
            page={page}
            actions={store}
            size={26}
            autoFocus={focusTitle}
            onEnter={() => {
              setTab('content');
              setTextFocus((n) => n + 1);
            }}
          />
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
      </Group>

      {!isRoot && (
        <Group gap="xs" px="lg" pt="md">
          <StudiedToggle
            studied={page.studied}
            onChange={(studied) => store.updatePage(page.id, { studied })}
            progress={{ map: project.title, ...projectProgress(project) }}
          />
        </Group>
      )}

      <Tabs value={tab} onChange={(v) => setTab((v as PanelTab) ?? 'content')} mt="md" className={classes.tabs}>
        <Tabs.List px="lg">
          <Tabs.Tab value="content">Content</Tabs.Tab>
          <Tabs.Tab value="related">Related ({related.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="content" className={classes.body}>
          <PageContent
            key={page.id}
            project={project}
            page={page}
            actions={pageActions}
            showTitle={false}
            focusEditor={focusEditor}
            onCursor={onCursor}
            focusSignal={textFocus}
            // The panel's top padding: the toolbar sticks at the very top, so no text shows above it
            toolbarOffset={-16}
          />
          {/* Help while the page is empty; once there is writing it only takes room */}
          {!page.content.trim() && (
            <Text size="xs" c="dimmed" mt="md">
              To add a page, type / and choose Page, then its name and Enter (Cmd/Ctrl+Enter to stay here). To connect pages, type [[ and a name.
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="related" className={classes.body}>
          {related.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nothing related yet. Type [[ in the content to link another page.
            </Text>
          ) : (
            <Stack gap="lg">
              {RELATION_SECTIONS.map(({ relation, label, hint, icon: Arrow }) => {
                const pages = related.filter((r) => r.relation === relation);
                if (pages.length === 0) return null;
                return (
                  <section key={relation} aria-label={`${label} (${pages.length})`}>
                    <Group gap={6} wrap="nowrap" className={classes.relationHead}>
                      <Arrow size={15} stroke={2} className={classes.relationArrow} aria-hidden />
                      <Text size="xs" fw={700} className={classes.relationLabel}>
                        {label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {pages.length}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb={4}>
                      {hint}
                    </Text>
                    <Stack gap={0}>
                      {pages.map(({ page: p }) => {
                        const l = lookOf(project, p.id, tree);
                        return (
                          <UnstyledButton key={p.id} className={classes.related} onClick={() => onSelect(p.id)}>
                            <ThemeIcon size={28} radius="xl" variant="light" color={l.color}>
                              <PageGlyph icon={p.module || p.id === project.rootPageId ? l.icon : 'book'} size={15} />
                            </ThemeIcon>
                            <Text size="sm" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                              {displayTitle(p)}
                            </Text>
                            <IconChevronRight size={16} className={classes.relatedOpen} aria-hidden />
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </section>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

      </Tabs>
    </Card>
  );
}

/** Root, then the parent; deeper paths fold the middle into an ellipsis */
function trailOf(ancestors: ReadonlyArray<Page>): ReadonlyArray<Page | null> {
  return ancestors.length <= 2 ? ancestors : [ancestors[0], null, ancestors[ancestors.length - 1]];
}
