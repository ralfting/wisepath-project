'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ActionIcon, Button, Card, Group, Menu, Modal, Progress, Radio, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconDotsVertical, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import type { ProjectKind, ProjectSummary } from '@wisepath/domain/projects';
import { useCreateProject, useProjects, useRemoveProject, useSetProjectKind } from '@/useCases/projects';
import { KIND_OPTIONS, KindSwitchItem } from './ProjectKind';
import { AppFrame } from '@/features/shell/AppFrame';
import { PageGlyph } from '@/features/shared/look';
import { mapHref, mapWithPageHref } from '@/features/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import classes from './ProjectsHome.module.css';

/**
 * ProjectsHome
 * Where a logged-in learner lands: one card per map (a learning path with its
 * progress and the way back to where they stopped; a study with its size), a
 * search over them, a way to start a new map, switch its kind, and delete one.
 */
export function ProjectsHome() {
  const projects = useProjects();
  const t = useT();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const shown = (projects ?? []).filter(
    (p) => !needle || p.title.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle),
  );

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
            {projects && projects.length > 0 && (
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
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)} style={{ flexShrink: 0 }}>
              {t('home.newPath')}
            </Button>
          </Group>
        </Group>

        {projects === null ? null : projects.length === 0 ? (
          <Text c="dimmed">{t('home.empty')}</Text>
        ) : shown.length === 0 ? (
          <Text c="dimmed">{t('home.noMatch', { query: query.trim() })}</Text>
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
  const [kindError, setKindError] = useState<string | null>(null);
  const setKind = useSetProjectKind();
  const t = useT();
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
              {t('home.card.pages', { count: total })}
              {modules > 0 ? ` · ${t('home.card.modules', { count: modules })}` : ''}
              {orphans > 0 ? ` · ${t('home.card.orphans', { count: orphans })}` : ''}
            </Text>
          </Stack>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('home.card.more', { title: project.title })} className={classes.action}>
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <KindSwitchItem kind={project.kind} onSwitch={async (kind) => setKindError(await setKind(project.id, kind))} />
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
                {t('home.card.delete')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        {project.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {project.description}
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
                <Progress value={total ? (studied / total) * 100 : 0} size="md" style={{ flex: 1 }} classNames={{ section: classes.progress }} aria-label={t('home.card.progress', { title: project.title })} />
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
              href={next ? mapWithPageHref(project.id, next.id) : href}
              leftSection={next ? <IconPlayerPlayFilled size={14} /> : undefined}
              variant={next ? 'filled' : 'light'}
              className={classes.action}
            >
              {t(!next ? 'home.card.open' : studied === 0 ? 'home.card.start' : 'home.card.continue')}
            </Button>
          </>
        )}
      </Stack>
      <DeleteMapModal opened={deleting} project={project} onClose={() => setDeleting(false)} />
    </Card>
  );
}

/** Names a new map, which starts as its root page, and says what it is for: a study unless chosen otherwise */
function NewMapModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const router = useRouter();
  const create = useCreateProject();
  const t = useT();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProjectKind>('study');
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
    setBusy(true);
    const result = await create(title, kind);
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
        <Radio.Group value={kind} onChange={(v) => setKind(v as ProjectKind)} label={t('home.create.kind')} description={t('home.create.kindHint')} mt="lg">
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

function DeleteMapModal({ opened, project, onClose }: { opened: boolean; project: ProjectSummary; onClose: () => void }) {
  const remove = useRemoveProject();
  const t = useT();
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
    <Modal opened={opened} onClose={onClose} title={t('home.delete.title')} centered radius="lg" size="md" closeButtonProps={{ 'aria-label': t('common.actions.close') }}>
      <Text size="sm">
        <b>{project.title}</b> {t('home.delete.body', { count: project.total + 1 })}
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
