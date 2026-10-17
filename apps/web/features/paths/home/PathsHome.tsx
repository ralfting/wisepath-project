'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import type { FormEvent } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Menu, Modal, Progress, Radio, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconDots, IconDotsVertical, IconFolderPlus, IconFolderShare, IconPencil, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import type { PathKind, PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { useCreatePath, useMovePath, usePaths, useRemovePath, useSetPathKind } from '@/useCases/paths';
import { useProjects } from '@/useCases/projects';
import { KIND_OPTIONS, KindSwitchItem } from '@/features/paths/path';
import { DeleteProjectModal, ProjectNameModal } from './ProjectModals';
import { showToast } from '@/features/inbox/capture';
import { AppFrame } from '@/features/shell';
import { PageGlyph } from '@/features/paths/path';
import { mapHref, mapWithPageHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';

/**
 * PathsHome
 * Where a logged-in learner lands: their paths, one group per project (the
 * default project first, then by name). One card per map (a learning path with
 * its progress and the way back to where they stopped; a study with its size),
 * a search over them, ways to start a map or a project, and each one's menu.
 */
export function PathsHome() {
  const paths = usePaths();
  const projects = useProjects();
  const t = useT();
  // The project a new path starts in; null while the dialog is closed
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false);
  const [query, setQuery] = useState('');
  // The card being dragged to another project, if any
  const [dragging, setDragging] = useState<PathSummary | null>(null);
  const movePath = useMovePath();

  /** Files a path in another project: shown there at once, back where it was if that fails; Undo moves it back */
  const move = async (path: PathSummary, to: Project) => {
    if (path.projectId === to.id) return;
    const from = projects?.find((p) => p.id === path.projectId);
    const failed = await movePath(path.id, to.id);
    showToast({
      text: failed ? `${t('home.card.moveFailed', { title: path.title })} ${failed}` : t('home.card.moved', { title: path.title, project: to.name }),
      ...(!failed && from ? { action: { label: t('home.card.undo'), onClick: () => void move({ ...path, projectId: to.id }, from) } } : {}),
    });
  };

  const needle = query.trim().toLowerCase();
  const shown = (paths ?? []).filter(
    (p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle),
  );
  const fallback = projects?.find((p) => p.isDefault) ?? projects?.[0];
  // A path whose project isn't listed (just deleted elsewhere) shows with the default
  const inProject = (project: Project) =>
    shown.filter((p) => p.projectId === project.id || (project === fallback && !projects?.some((q) => q.id === p.projectId)));
  const groups = (projects ?? []).map((project) => ({ project, paths: inProject(project) }));
  // While searching, a project with nothing matching is left out
  const visible = needle ? groups.filter((g) => g.paths.length > 0) : groups;

  return (
    <AppFrame crumbs={[{ label: t('home.title') }]}>
      <Stack gap="xl" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={1200}>
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4}>
            <Title order={1} fz={34} lts={-0.6}>
              {t('home.title')}
            </Title>
            <Text c="dimmed">{t('home.intro')}</Text>
          </Stack>
          <Group gap="sm" wrap="nowrap">
            {paths && paths.length > 0 && (
              <TextInput
                type="search"
                placeholder={t('home.search')}
                aria-label={t('home.search')}
                leftSection={<IconSearch size={16} />}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                w={{ base: '100%', xs: 240 }}
              />
            )}
            <Button variant="default" leftSection={<IconFolderPlus size={16} />} onClick={() => setNewProject(true)} style={{ flexShrink: 0 }}>
              {t('home.newProject')}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => fallback && setCreatingIn(fallback.id)}
              disabled={!fallback}
              style={{ flexShrink: 0 }}
            >
              {t('home.newPath')}
            </Button>
          </Group>
        </Group>

        {paths === null || projects === null ? null : needle && visible.length === 0 ? (
          <Text c="dimmed">{t('home.noMatch', { query: query.trim() })}</Text>
        ) : (
          visible.map(({ project, paths: inThis }) => (
            <ProjectGroup
              key={project.id}
              project={project}
              paths={inThis}
              projects={projects}
              fallback={fallback?.name ?? ''}
              onNewPath={() => setCreatingIn(project.id)}
              dragging={dragging}
              onDrag={setDragging}
              onMove={move}
            />
          ))
        )}
      </Stack>
      {projects && (
        <NewMapModal opened={creatingIn !== null} projectId={creatingIn} projects={projects} onClose={() => setCreatingIn(null)} />
      )}
      <ProjectNameModal opened={newProject} onClose={() => setNewProject(false)} />
    </AppFrame>
  );
}

/** One project's paths, under its name, with its own New path and its menu */
function ProjectGroup({
  project,
  paths,
  projects,
  fallback,
  onNewPath,
  dragging,
  onDrag,
  onMove,
}: {
  project: Project;
  paths: ReadonlyArray<PathSummary>;
  projects: ReadonlyArray<Project>;
  fallback: string;
  onNewPath: () => void;
  /** The card being dragged, from any project */
  dragging: PathSummary | null;
  onDrag: (path: PathSummary | null) => void;
  onMove: (path: PathSummary, to: Project) => void;
}) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [over, setOver] = useState(false);
  // A card from another project can be dropped here
  const accepts = dragging !== null && dragging.projectId !== project.id;

  const onDragOver = (event: DragEvent) => {
    if (!accepts) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(true);
  };
  const onDragLeave = (event: DragEvent) => {
    // Leaving for a child of the group is still over it
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (accepts) onMove(dragging, project);
    onDrag(null);
  };

  return (
    <Stack
      gap="md"
      component="section"
      aria-label={project.name}
      className={classes.group}
      data-accepts={accepts || undefined}
      data-over={(accepts && over) || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Group gap="sm" wrap="nowrap">
        <Title order={2} fz={20} lineClamp={1}>
          {project.name}
        </Title>
        {project.isDefault && (
          <Tooltip label={t('home.project.defaultHint')} multiline w={260} withArrow>
            <Badge variant="light" color="gray" size="sm" style={{ flexShrink: 0 }}>
              {t('home.project.default')}
            </Badge>
          </Tooltip>
        )}
        {/* An empty project says so below */}
        {paths.length > 0 && (
          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
            {t('home.project.paths', { count: paths.length })}
          </Text>
        )}
        <Group gap={4} ml="auto" wrap="nowrap">
          <Tooltip label={t('home.project.newPath', { name: project.name })} withArrow>
            <ActionIcon variant="subtle" color="gray" aria-label={t('home.project.newPath', { name: project.name })} onClick={onNewPath}>
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('home.project.more', { name: project.name })}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={15} />} onClick={() => setRenaming(true)}>
                {t('home.project.rename')}
              </Menu.Item>
              {/* The default project takes the paths of deleted ones, so it stays */}
              {!project.isDefault && (
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
                  {t('home.project.delete')}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
      {paths.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('home.project.empty')}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {paths.map((path) => (
            <PathCard key={path.id} path={path} projects={projects} dragging={dragging?.id === path.id} onDrag={onDrag} onMove={onMove} />
          ))}
        </SimpleGrid>
      )}
      <ProjectNameModal opened={renaming} project={project} onClose={() => setRenaming(false)} />
      {!project.isDefault && (
        <DeleteProjectModal opened={deleting} project={project} paths={paths.length} fallback={fallback} onClose={() => setDeleting(false)} />
      )}
    </Stack>
  );
}

function PathCard({
  path,
  projects,
  dragging,
  onDrag,
  onMove,
}: {
  path: PathSummary;
  projects: ReadonlyArray<Project>;
  /** This card is the one being dragged */
  dragging: boolean;
  onDrag: (path: PathSummary | null) => void;
  onMove: (path: PathSummary, to: Project) => void;
}) {
  const { studied, total, modules, orphans, next } = path;
  const [deleting, setDeleting] = useState(false);
  const [kindError, setKindError] = useState<string | null>(null);
  const setKind = useSetPathKind();
  const elsewhere = projects.filter((p) => p.id !== path.projectId);
  const t = useT();
  const href = mapHref(path.id);
  // A study shows its size only: no progress, nothing to continue; the whole card opens it
  const progress = path.kind === 'learningPath';

  return (
    <Card
      padding="lg"
      className={classes.card}
      // Dragged onto another project's group to move it there (Move to in the menu does the same)
      draggable
      data-dragging={dragging || undefined}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', path.title);
        onDrag(path);
      }}
      onDragEnd={() => onDrag(null)}
    >
      <Stack gap="md" h="100%">
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={52} radius="xl" variant="light" color={path.color}>
            <PageGlyph icon={path.icon} size={27} />
          </ThemeIcon>
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            <Text component={Link} href={href} fw={800} fz={20} className={classes.title} truncate>
              {path.title}
            </Text>
            <Text size="sm" c="dimmed">
              {t('home.card.pages', { count: total })}
              {modules > 0 ? ` · ${t('home.card.modules', { count: modules })}` : ''}
              {orphans > 0 ? ` · ${t('home.card.orphans', { count: orphans })}` : ''}
            </Text>
          </Stack>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('home.card.more', { title: path.title })} className={classes.action}>
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <KindSwitchItem kind={path.kind} onSwitch={async (kind) => setKindError(await setKind(path.id, kind))} />
              {elsewhere.length > 0 && (
                <Menu.Sub position="left-start">
                  <Menu.Sub.Target>
                    <Menu.Sub.Item leftSection={<IconFolderShare size={15} />}>{t('home.card.moveTo')}</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    {elsewhere.map((project) => (
                      <Menu.Item key={project.id} onClick={() => onMove(path, project)}>
                        {project.name}
                      </Menu.Item>
                    ))}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
              )}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
                {t('home.card.delete')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        {path.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {path.description}
          </Text>
        )}
        {kindError && (
          <Text size="sm" c="red" role="alert">
            {kindError}
          </Text>
        )}
        {progress && (
          <>
            <Stack gap={6} mt="auto">
              <Group gap="sm" wrap="nowrap">
                <Progress value={total ? (studied / total) * 100 : 0} size="md" style={{ flex: 1 }} classNames={{ section: classes.progress }} aria-label={t('home.card.progress', { title: path.title })} />
                <Text fw={700} size="sm">
                  {total ? Math.round((studied / total) * 100) : 0}%
                </Text>
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {t('home.card.studied', { studied, count: total })}
                {next ? ` · ${t('home.card.next', { title: next.title })}` : ''}
              </Text>
            </Stack>
            <Button
              component={Link}
              href={next ? mapWithPageHref(path.id, next.id) : href}
              leftSection={next ? <IconPlayerPlayFilled size={14} /> : undefined}
              variant={next ? 'filled' : 'light'}
              className={classes.action}
            >
              {t(!next ? 'home.card.open' : studied === 0 ? 'home.card.start' : 'home.card.continue')}
            </Button>
          </>
        )}
      </Stack>
      <DeleteMapModal opened={deleting} path={path} onClose={() => setDeleting(false)} />
    </Card>
  );
}

/**
 * Names a new map, which starts as its root page, files it in a project (the
 * one it was opened from) and says what it is for: a study unless chosen otherwise
 */
function NewMapModal({
  opened,
  projectId,
  projects,
  onClose,
}: {
  opened: boolean;
  projectId: string | null;
  projects: ReadonlyArray<Project>;
  onClose: () => void;
}) {
  const router = useRouter();
  const create = useCreatePath();
  const t = useT();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PathKind>('study');
  const [project, setProject] = useState<string | null>(projectId);

  // Opens on the project it was opened from
  useEffect(() => {
    if (opened) setProject(projectId);
  }, [opened, projectId]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTitle('');
    setKind('study');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError(t('home.create.nameRequired'));
    if (!project) return;
    setBusy(true);
    const result = await create(title, kind, project);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    close();
    // Straight to writing: the map with its main page open, the cursor in the text
    router.push(`${mapWithPageHref(result.value.id, result.value.rootPageId)}&new=1`);
  };

  return (
    <Modal opened={opened} onClose={close} title={t('home.create.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <form onSubmit={submit} noValidate>
        <TextInput
          label={t('home.create.name')}
          description={t('home.create.nameHint')}
          placeholder={t('home.create.namePlaceholder')}
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          maxLength={200}
          data-autofocus
        />
        <Select
          label={t('home.create.project')}
          data={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={project}
          onChange={setProject}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
          mt="lg"
        />
        <Radio.Group value={kind} onChange={(v) => setKind(v as PathKind)} label={t('home.create.kind')} description={t('home.create.kindHint')} mt="lg">
          <Stack gap="xs" mt="xs">
            {KIND_OPTIONS.map((option) => (
              <Radio.Card key={option.value} value={option.value} radius="md" p="sm" className={classes.kindCard}>
                <Group wrap="nowrap" align="flex-start" gap="sm">
                  <Radio.Indicator mt={2} />
                  <ThemeIcon variant="light" color={option.color} radius="md" size={34}>
                    <option.icon size={19} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {t(option.label)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t(option.hint)}
                    </Text>
                  </div>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>
        <Group justify="flex-end" gap="sm" mt="lg">
          <Button variant="default" onClick={close}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('home.create.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

function DeleteMapModal({ opened, path, onClose }: { opened: boolean; path: PathSummary; onClose: () => void }) {
  const remove = useRemovePath();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const message = await remove(path.id);
    setBusy(false);
    if (message) return setError(message);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('home.delete.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">
        <b>{path.title}</b> {t('home.delete.body', { count: path.total + 1 })}
      </Text>
      {error && (
        <Text size="sm" c="red.7" mt="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t('home.delete.keep')}
        </Button>
        <Button color="red" onClick={confirm} loading={busy}>
          {t('home.delete.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
