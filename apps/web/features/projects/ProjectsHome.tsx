'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ActionIcon, Button, Card, Group, Menu, Modal, Progress, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconDotsVertical, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import type { ProjectSummary } from '@wisepath/domain/projects';
import { useCreateProject, useProjects, useRemoveProject } from '@/useCases/projects';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { mapHref, mapWithPageHref } from '@/features/shared/routes';
import classes from './ProjectsHome.module.css';

/**
 * ProjectsHome
 * Where a logged-in learner lands: one card per map (a learning path with its
 * progress and the way back to where they stopped; a study with its size), a
 * search over them, a way to start a new map, and to delete one.
 */
export function ProjectsHome() {
  const projects = useProjects();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const shown = (projects ?? []).filter(
    (p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle),
  );

  return (
    <AppFrame crumbs={[{ label: 'My paths' }]}>
      <Stack gap="xl" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={1200}>
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4}>
            <Title order={1} fz={34} lts={-0.6}>
              My paths
            </Title>
            <Text c="dimmed">Each path is a subject you are learning, page by page, connected by the links you write.</Text>
          </Stack>
          <Group gap="sm" wrap="nowrap">
            {projects && projects.length > 0 && (
              <TextInput
                type="search"
                placeholder="Search paths"
                aria-label="Search paths"
                leftSection={<IconSearch size={16} />}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                w={{ base: '100%', xs: 240 }}
              />
            )}
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)} style={{ flexShrink: 0 }}>
              New path
            </Button>
          </Group>
        </Group>

        {projects === null ? null : projects.length === 0 ? (
          <Text c="dimmed">No paths yet. Start one with New path.</Text>
        ) : shown.length === 0 ? (
          <Text c="dimmed">No paths match &ldquo;{query.trim()}&rdquo;.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {shown.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
      <NewMapModal opened={creating} onClose={() => setCreating(false)} />
    </AppFrame>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const { studied, total, modules, orphans, next } = project;
  const [deleting, setDeleting] = useState(false);
  const href = mapHref(project.id);
  // A study shows its size only: no progress, nothing to continue; the whole card opens it
  const progress = project.kind === 'learningPath';

  return (
    <Card padding="lg" className={classes.card}>
      <Stack gap="md" h="100%">
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={52} radius="xl" variant="light" color={project.color}>
            <PageGlyph icon={project.icon} size={27} />
          </ThemeIcon>
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            <Text component={Link} href={href} fw={800} fz={20} className={classes.title} truncate>
              {project.title}
            </Text>
            <Text size="sm" c="dimmed">
              {total} {total === 1 ? 'page' : 'pages'}
              {modules > 0 ? ` · ${modules} ${modules === 1 ? 'module' : 'modules'}` : ''}
              {orphans > 0 ? ` · ${orphans} orphan${orphans === 1 ? '' : 's'}` : ''}
            </Text>
          </Stack>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={`More for ${project.title}`} className={classes.action}>
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
                Delete path
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        {project.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {project.description}
          </Text>
        )}
        {progress && (
          <>
            <Stack gap={6} mt="auto">
              <Group gap="sm" wrap="nowrap">
                <Progress value={total ? (studied / total) * 100 : 0} size="md" style={{ flex: 1 }} classNames={{ section: classes.progress }} aria-label={`Progress in ${project.title}`} />
                <Text fw={700} size="sm">
                  {total ? Math.round((studied / total) * 100) : 0}%
                </Text>
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {studied} of {total} pages studied
                {next ? ` · Next: ${next.title}` : ''}
              </Text>
            </Stack>
            <Button
              component={Link}
              href={next ? mapWithPageHref(project.id, next.id) : href}
              leftSection={next ? <IconPlayerPlayFilled size={14} /> : undefined}
              variant={next ? 'filled' : 'light'}
              className={classes.action}
            >
              {!next ? 'Open path' : studied === 0 ? 'Start studying' : 'Continue studying'}
            </Button>
          </>
        )}
      </Stack>
      <DeleteMapModal opened={deleting} project={project} onClose={() => setDeleting(false)} />
    </Card>
  );
}

/** Names a new map, which starts as its root page */
function NewMapModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const router = useRouter();
  const create = useCreateProject();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTitle('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Give the path a name');
    setBusy(true);
    const result = await create(title);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    close();
    // Straight to writing: the map with its main page open, the cursor in the text
    router.push(`${mapWithPageHref(result.value.id, result.value.rootPageId)}&new=1`);
  };

  return (
    <Modal opened={opened} onClose={close} title="New path" centered radius="lg" size="md">
      <form onSubmit={submit} noValidate>
        <TextInput
          label="What are you learning?"
          description="The path's main page takes this name. Add pages to it by typing / and choosing Page."
          placeholder="Rust, Linear algebra, Japanese…"
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          maxLength={200}
          data-autofocus
        />
        <Group justify="flex-end" gap="sm" mt="lg">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create path
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

function DeleteMapModal({ opened, project, onClose }: { opened: boolean; project: ProjectSummary; onClose: () => void }) {
  const remove = useRemoveProject();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const message = await remove(project.id);
    setBusy(false);
    if (message) return setError(message);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Delete path?" centered radius="lg" size="md">
      <Text size="sm">
        <b>{project.title}</b> and its {project.total + 1} pages will be deleted, with what you marked as studied. This
        can&apos;t be undone.
      </Text>
      {error && (
        <Text size="sm" c="red.7" mt="sm">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          Keep it
        </Button>
        <Button color="red" onClick={confirm} loading={busy}>
          Delete path
        </Button>
      </Group>
    </Modal>
  );
}
