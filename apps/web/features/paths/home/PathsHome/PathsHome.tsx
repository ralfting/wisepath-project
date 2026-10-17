'use client';

import { Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconFolderPlus, IconPlus, IconSearch } from '@tabler/icons-react';
import { ProjectNameModal } from './ProjectNameModal/ProjectNameModal';
import { AppFrame } from '@/features/shell';
import { useT } from '@/i18n/I18nProvider';
import { NewMapModal } from './NewMapModal/NewMapModal';
import { OthersGroup } from './OthersGroup';
import { ProjectGroup } from './ProjectGroup/ProjectGroup';
import { usePathsHome } from './usePathsHome';

/**
 * Where a logged-in learner lands: their paths, one group per project (the
 * default project first, then by name). One card per map (a learning path with
 * its progress and the way back to where they stopped; a study with its size),
 * a search over them, ways to start a map or a project, and each one's menu.
 * Paths shared with them or taken to study follow, in a group of their own.
 */
export function PathsHome() {
  const t = useT();
  const { state, operations } = usePathsHome();

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
            {state.hasPaths && (
              <TextInput
                type="search"
                placeholder={t('home.search')}
                aria-label={t('home.search')}
                leftSection={<IconSearch size={16} />}
                value={state.query}
                onChange={(event) => operations.setQuery(event.currentTarget.value)}
                onKeyDown={(event) => event.key === 'Escape' && operations.clearQuery()}
                w={{ base: '100%', xs: 240 }}
              />
            )}
            <Button variant="default" leftSection={<IconFolderPlus size={16} />} onClick={operations.openNewProject} style={{ flexShrink: 0 }}>
              {t('home.newProject')}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => state.fallback && operations.newPathIn(state.fallback.id)}
              disabled={!state.fallback}
              style={{ flexShrink: 0 }}
            >
              {t('home.newPath')}
            </Button>
          </Group>
        </Group>

        {!state.loaded ? null : state.searching && state.groups.length === 0 && state.others.length === 0 ? (
          <Text c="dimmed">{t('home.noMatch', { query: state.query.trim() })}</Text>
        ) : (
          state.groups.map(({ project, paths: inThis }) => (
            <ProjectGroup
              key={project.id}
              project={project}
              paths={inThis}
              projects={state.projects ?? []}
              fallback={state.fallback?.name ?? ''}
              onNewPath={() => operations.newPathIn(project.id)}
              dragging={state.dragging}
              onDrag={operations.setDragging}
              onMove={operations.move}
            />
          ))
        )}
        {state.loaded && state.others.length > 0 && <OthersGroup paths={state.others} />}
      </Stack>
      {state.projects && (
        <NewMapModal opened={state.creatingIn !== null} projectId={state.creatingIn} projects={state.projects} onClose={operations.closeNewPath} />
      )}
      <ProjectNameModal opened={state.newProject} onClose={operations.closeNewProject} />
    </AppFrame>
  );
}
