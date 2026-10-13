'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ActionIcon, Button, Card, Group, Menu, Modal, Progress, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconDotsVertical, IconPlayerPlayFilled, IconPlus, IconTrash } from '@tabler/icons-react';
import type { ProjectSummary } from '@wisepath/domain/projects';
import { useCreateProject, useProjects, useRemoveProject } from '@/useCases/projects';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { mapHref, mapWithPageHref } from '@/features/shared/routes';
import classes from './ProjectsHome.module.css';

/**
 * ProjectsHome
 * Where a logged-in learner lands: one card per map with its progress and the
 * way back to where they stopped, a way to start a new map, and to delete one.
 */
export function ProjectsHome() {
  const projects = useProjects();
  const [creating, setCreating] = useState(false);

  return (
    <AppFrame crumbs={[{ label: 'My paths' }]}>
      <Stack gap="xl" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={1200}>
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={4}>
            <Title order={1} fz={34} lts={-0.6}>
              My paths
            </Title>
            <Text c="dimmed">Each map is a subject you are learning, page by page, connected by the links you write.</Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            New map
          </Button>
        </Group>

        {projects === null ? null : projects.length === 0 ? (
          <Text c="dimmed">No maps yet. Start one with New map.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {projects.map((project) => (
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
                Delete map
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        {project.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {project.description}
          </Text>
        )}
        <Stack gap={6} mt="auto">
          <Group gap="sm" wrap="nowrap">
            <Progress value={total ? (studied / total) * 100 : 0} size="md" style={{ flex: 1 }} classNames={{ section: classes.progress }} aria-label={`Progress in ${project.title}`} />
            <Text fw={700} size="sm">
              {total ? Math.round((studied / total) * 100) : 0}%
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {studied} of {total} pages studied
          </Text>
        </Stack>
        <Button
          component={Link}
          href={next ? mapWithPageHref(project.id, next.id) : href}
          leftSection={next ? <IconPlayerPlayFilled size={14} /> : undefined}
          variant={next ? 'filled' : 'light'}
          className={classes.action}
        >
          {next ? 'Continue studying' : 'Open map'}
        </Button>
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
    if (!title.trim()) return setError('Give the map a name');
    setBusy(true);
    const result = await create(title);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    close();
    // Straight to writing: the map with its main page open, the cursor in the text
    router.push(`${mapWithPageHref(result.value.id, result.value.rootPageId)}&new=1`);
  };

  return (
    <Modal opened={opened} onClose={close} title="New map" centered radius="lg" size="md">
      <form onSubmit={submit} noValidate>
        <TextInput
          label="What are you learning?"
          description="The map's main page takes this name. Link new pages from it with [[Title]]."
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
            Create map
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
    <Modal opened={opened} onClose={onClose} title="Delete map?" centered radius="lg" size="md">
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
          Delete map
        </Button>
      </Group>
    </Modal>
  );
}
