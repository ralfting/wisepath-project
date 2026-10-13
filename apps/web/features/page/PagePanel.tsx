'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Card,
  ColorSwatch,
  Group,
  Menu,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconArrowsDiagonal, IconCheck, IconChevronRight, IconDotsVertical, IconTrash, IconX } from '@tabler/icons-react';
import type { Page, Project, Relation } from '@wisepath/domain/projects';
import {
  PageColor,
  PageIcon,
  branchProgress,
  displayTitle,
  lookOf,
  mapTree,
  pathTo,
  projectProgress,
  relatedPages,
} from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { PageGlyph, shade } from '@/features/shared/look';
import { PageContent, PageTitleInput } from './PageContent';
import type { EditorFocus } from '@/features/editor/MarkdownEditor';
import type { PageActions } from './PageContent';
import { DeletePageModal } from './DeletePageModal';
import { StudiedToggle } from './StudiedToggle';
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
  /** Follows the cursor in the text */
  onCursor?: (pos: number) => void;
}

type PanelTab = 'content' | 'related' | 'settings';

const RELATION_LABEL: Record<Relation, string> = {
  parent: 'This page branches from it',
  child: 'Branches from this page',
  linksTo: 'Referenced in this page',
  linkedFrom: 'References this page',
};

export function PagePanel({ project, page, store, onSelect, onExpand, onClose, flat = false, back, focusEditor = null, onCursor }: PagePanelProps) {
  const [tab, setTab] = useState<PanelTab>('content');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRoot = page.id === project.rootPageId;
  const tree = mapTree(project);
  const isOrphan = !tree.nodes.has(page.id);
  const path = pathTo(project, page.id, tree);
  const look = lookOf(project, page.id, tree);
  const related = relatedPages(project, page.id);
  const below = branchProgress(project, page.id);
  const branchFrom = path.length > 1 ? path[path.length - 2] : null;

  const pageActions: PageActions = {
    updatePage: store.updatePage,
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
        <ThemeIcon size={60} radius="xl" variant="light" color={look.color} className={classes.icon}>
          <PageGlyph icon={isRoot || page.module ? look.icon : 'book'} size={30} />
        </ThemeIcon>
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <PageTitleInput key={page.id} project={project} page={page} actions={store} size={26} />
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
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
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
          />
          <Text size="xs" c="dimmed" mt="md">
            To add a page, type / and choose Page, then its name and Enter (Cmd/Ctrl+Enter to stay here). To connect pages, type [[ and a name.
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="related" className={classes.body}>
          {related.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nothing related yet. Type [[ in the content to link another page.
            </Text>
          ) : (
            <Stack gap={2}>
              {related.map(({ page: p, relation }) => {
                const l = lookOf(project, p.id, tree);
                return (
                  <UnstyledButton key={p.id} className={classes.related} onClick={() => onSelect(p.id)}>
                    <ThemeIcon size={28} radius="xl" variant="light" color={l.color}>
                      <PageGlyph icon={p.module || p.id === project.rootPageId ? l.icon : 'book'} size={15} />
                    </ThemeIcon>
                    <Stack gap={0} miw={0} style={{ flex: 1 }}>
                      <Text size="sm" fw={600} truncate>
                        {displayTitle(p)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {RELATION_LABEL[relation]}
                      </Text>
                    </Stack>
                    <IconArrowRight size={17} color="var(--mantine-color-blue-6)" />
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="settings" className={classes.body}>
          <Settings project={project} page={page} store={store} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

/** Root, then the parent; deeper paths fold the middle into an ellipsis */
function trailOf(ancestors: ReadonlyArray<Page>): ReadonlyArray<Page | null> {
  return ancestors.length <= 2 ? ancestors : [ancestors[0], null, ancestors[ancestors.length - 1]];
}

function Settings({ project, page, store }: { project: Project; page: Page; store: ProjectActions }) {
  const isRoot = page.id === project.rootPageId;
  const look = lookOf(project, page.id);
  const styled = isRoot || !!page.module;

  return (
    <Stack gap="lg">
      {isRoot ? (
        <Textarea
          label="Description"
          description="One line under the path's title."
          autosize
          minRows={2}
          value={project.description ?? ''}
          onChange={(e) => store.setDescription(e.currentTarget.value)}
        />
      ) : (
        <Switch
          label="Show as a module"
          description="Drawn larger on the map, with its own colour and icon; pages below it take the colour. Nothing else changes."
          checked={!!page.module}
          onChange={(e) =>
            store.setLook(page.id, e.currentTarget.checked ? { module: true, color: look.color, icon: page.icon ?? look.icon } : { module: false })
          }
        />
      )}
      {styled && (
        <>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Colour
            </Text>
            <Group gap={8}>
              {PageColor.literals.map((color) => (
                <ColorSwatch
                  key={color}
                  component="button"
                  type="button"
                  color={shade(color, 6)}
                  size={26}
                  aria-label={color}
                  aria-pressed={look.color === color}
                  onClick={() => store.setLook(page.id, { color })}
                  className={classes.swatch}
                >
                  {look.color === color && <IconCheck size={14} color="white" stroke={3} />}
                </ColorSwatch>
              ))}
            </Group>
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Icon
            </Text>
            <SimpleGrid cols={8} spacing={6} maw={340}>
              {PageIcon.literals.map((icon) => (
                <ActionIcon
                  key={icon}
                  size={36}
                  radius="md"
                  variant={look.icon === icon ? 'light' : 'default'}
                  color={look.color}
                  aria-label={icon}
                  aria-pressed={look.icon === icon}
                  onClick={() => store.setLook(page.id, { icon })}
                >
                  <PageGlyph icon={icon} size={18} />
                </ActionIcon>
              ))}
            </SimpleGrid>
          </Stack>
        </>
      )}
    </Stack>
  );
}
