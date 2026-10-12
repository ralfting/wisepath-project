'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Box,
  Breadcrumbs,
  Button,
  Card,
  ColorSwatch,
  Group,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowRight,
  IconArrowsDiagonal,
  IconCheck,
  IconChevronRight,
  IconDotsVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { Page, Project, Relation } from '@wisepath/domain/projects';
import {
  PageColor,
  PageIcon,
  displayTitle,
  lookOf,
  moduleOf,
  progressOf,
  projectProgress,
  relatedPages,
  roleOf,
  structureOf,
} from '@wisepath/domain/projects';
import type { ProjectActions } from '@/useCases/projects';
import { PageGlyph, shade } from '@/features/shared/look';
import { PageContent, PageTitleInput } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';
import classes from './PagePanel.module.css';

/**
 * PagePanel
 * The selected page beside the map: where it sits, its title and markdown,
 * the pages related to it, and (for the root and modules) how it looks.
 */

interface PagePanelProps {
  project: Project;
  page: Page;
  store: ProjectActions;
  onSelect: (pageId: string) => void;
  fullPageHref: string;
}

type PanelTab = 'content' | 'related' | 'settings';

const RELATION_LABEL: Record<Relation, (role: string | undefined) => string> = {
  parent: (role) => (role === 'module' ? 'The map' : 'Module of this topic'),
  child: (role) => (role === 'root' ? 'Module' : 'Topic in this module'),
  linksTo: () => 'Referenced in this page',
  linkedFrom: () => 'References this page',
};

export function PagePanel({ project, page, store, onSelect, fullPageHref }: PagePanelProps) {
  const [tab, setTab] = useState<PanelTab>('content');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const role = roleOf(project, page.id);
  const look = lookOf(project, page.id);
  const related = relatedPages(project, page.id);
  const parentModule = moduleOf(project, page.id);
  const root = structureOf(project).root;
  const trail = [root, ...(parentModule ? [parentModule.page] : [])].filter((p) => p.id !== page.id);

  const pageActions: PageActions = {
    updatePage: store.updatePage,
    renameLinks: store.renameLinks,
    openPage: onSelect,
    createLinkedPage: (title) => onSelect(store.addTopic(page.id, title).id),
  };

  const progress = role === 'root' ? projectProgress(project) : role === 'module' && parentModule ? progressOf(parentModule.topics) : null;
  const subtitle =
    role === 'root'
      ? 'The map'
      : role === 'module'
        ? 'Module'
        : parentModule
          ? `Topic in ${displayTitle(parentModule.page)}`
          : 'Topic';

  return (
    <Card padding={0} className={classes.panel} aria-label="Selected page" component="aside">
      <Group justify="space-between" wrap="nowrap" px="lg" pt="md" gap="xs">
        <Breadcrumbs separator={<IconChevronRight size={14} />} className={classes.trail}>
          {trail.map((p) => (
            <Anchor key={p.id} component="button" type="button" size="sm" c="dimmed" onClick={() => onSelect(p.id)}>
              {displayTitle(p)}
            </Anchor>
          ))}
          <Text size="sm" fw={600} truncate>
            {displayTitle(page)}
          </Text>
        </Breadcrumbs>
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Open full screen">
            <ActionIcon component={Link} href={fullPageHref} variant="subtle" color="gray" aria-label="Open full screen">
              <IconArrowsDiagonal size={17} />
            </ActionIcon>
          </Tooltip>
          {role !== 'root' && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label="More">
                  <IconDotsVertical size={17} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
                  Delete {role === 'module' ? 'module' : 'topic'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      {confirmDelete && (
        <Box mx="lg" mt="sm" p="sm" className={classes.confirm}>
          <Text size="sm">
            Delete <b>{displayTitle(page)}</b>
            {role === 'module' && parentModule && parentModule.topics.length > 0
              ? ` and its ${parentModule.topics.length} ${parentModule.topics.length === 1 ? 'topic' : 'topics'}`
              : ''}
            ? Links to it stay in other pages and show as missing. This can&apos;t be undone.
          </Text>
          <Group gap="xs" mt="sm">
            <Button
              color="red"
              size="xs"
              onClick={() => {
                setConfirmDelete(false);
                store.deletePage(page.id);
                onSelect(parentModule && role === 'topic' ? parentModule.page.id : root.id);
              }}
            >
              Delete
            </Button>
            <Button variant="default" size="xs" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </Group>
        </Box>
      )}

      <Group gap="md" wrap="nowrap" align="flex-start" px="lg" pt="md">
        <ThemeIcon size={60} radius="xl" variant="light" color={look.color} className={classes.icon}>
          <PageGlyph icon={look.icon} size={30} />
        </ThemeIcon>
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <PageTitleInput key={page.id} page={page} actions={store} size={26} />
          <Text size="sm" c="dimmed">
            {subtitle}
            {progress ? ` · ${progress.studied} of ${progress.total} topics studied` : ''}
          </Text>
        </Stack>
      </Group>

      <Group gap="xs" px="lg" pt="md">
        {role === 'topic' && <StudiedToggle studied={page.studied} onChange={(studied) => store.updatePage(page.id, { studied })} />}
        {role !== 'topic' && (
          <AddPageButton
            label={role === 'root' ? 'Add module' : 'Add topic'}
            placeholder={role === 'root' ? 'Name the module' : 'Name the topic'}
            onAdd={(title) => (role === 'root' ? store.addModule(title) : store.addTopic(page.id, title))}
          />
        )}
      </Group>

      <Tabs value={tab} onChange={(v) => setTab((v as PanelTab) ?? 'content')} mt="md" className={classes.tabs}>
        <Tabs.List px="lg">
          <Tabs.Tab value="content">Content</Tabs.Tab>
          <Tabs.Tab value="related">Related ({related.length})</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="content" className={classes.body}>
          <PageContent key={page.id} project={project} page={page} actions={pageActions} showTitle={false} />
        </Tabs.Panel>

        <Tabs.Panel value="related" className={classes.body}>
          {related.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nothing related yet. Type [[ in the content to reference another page.
            </Text>
          ) : (
            <Stack gap={2}>
              {related.map(({ page: p, relation }) => {
                const l = lookOf(project, p.id);
                return (
                  <UnstyledButton key={p.id} className={classes.related} onClick={() => onSelect(p.id)}>
                    <ThemeIcon size={28} radius="xl" variant="light" color={l.color}>
                      <PageGlyph icon={l.icon} size={15} />
                    </ThemeIcon>
                    <Stack gap={0} miw={0} style={{ flex: 1 }}>
                      <Text size="sm" fw={600} truncate>
                        {displayTitle(p)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {RELATION_LABEL[relation](role)}
                      </Text>
                    </Stack>
                    <IconArrowRight size={17} color="var(--mantine-color-blue-6)" />
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
          <Text size="xs" c="dimmed" mt="md">
            Any page can reference any other: type [[ in the content and pick a page.
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="settings" className={classes.body}>
          <Settings project={project} page={page} store={store} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

function Settings({ project, page, store }: { project: Project; page: Page; store: ProjectActions }) {
  const role = roleOf(project, page.id);
  const look = lookOf(project, page.id);
  const { modules } = structureOf(project);

  if (role === 'topic') {
    return (
      <Select
        label="Module"
        description="Topics take their module's colour and icon."
        data={modules.map((m) => ({ value: m.page.id, label: displayTitle(m.page) }))}
        value={page.parentId ?? null}
        onChange={(value) => value && store.moveTopic(page.id, value)}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
    );
  }

  return (
    <Stack gap="lg">
      {role === 'root' && (
        <Textarea
          label="Description"
          description="One line under the map's title."
          autosize
          minRows={2}
          value={project.description ?? ''}
          onChange={(e) => store.setDescription(e.currentTarget.value)}
        />
      )}
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
    </Stack>
  );
}

/** A button that turns into a name field; Enter adds and keeps the field open for the next one */
function AddPageButton({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (title: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <Button variant="light" size="xs" leftSection={<IconPlus size={15} />} onClick={() => setDraft('')}>
        {label}
      </Button>
    );
  }
  const add = () => {
    if (draft.trim()) onAdd(draft.trim());
    setDraft('');
  };
  return (
    <TextInput
      autoFocus
      size="xs"
      w="100%"
      aria-label={placeholder}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          add();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setDraft(null);
        }
      }}
      onBlur={() => {
        if (draft.trim()) onAdd(draft.trim());
        setDraft(null);
      }}
      description="Enter adds it and keeps the field open. Esc closes."
      inputWrapperOrder={['input', 'description']}
    />
  );
}
