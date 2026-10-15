'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Badge, Group, Loader, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconFileText, IconSearch } from '@tabler/icons-react';
import type { ProjectSummary } from '@wisepath/domain/projects';
import { useT } from '@/i18n/I18nProvider';
import { useProject, useProjects } from '@/useCases/projects';
import type { PageTarget } from '@/useCases/inbox';
import { PageGlyph } from '@/features/shared/look';
import { displayTitle } from '@/features/shared/title';
import { CaptureBox, PaletteOptions, lastPathId, paletteFieldProps, usePaletteId, usePaletteKeys } from '@/features/capture';
import classes from './PagePicker.module.css';

/**
 * PagePicker
 * Where an Inbox item goes: a path, then one of its pages, each a searchable
 * list in the palette, from the keyboard alone. The path last opened comes
 * first. Backspace in an empty search goes back to the paths.
 */

export interface PickedPage extends PageTarget {
  readonly pageTitle: string;
}

const matches = (title: string, query: string) => title.toLowerCase().includes(query.trim().toLowerCase());

export function PagePicker({
  opened,
  title,
  onClose,
  onPick,
}: {
  opened: boolean;
  /** What picking does: "File to…", "Make it a page linked from…" */
  title: string;
  onClose: () => void;
  onPick: (page: PickedPage) => void;
}) {
  const t = useT();
  const [path, setPath] = useState<ProjectSummary | null>(null);
  const close = () => {
    setPath(null);
    onClose();
  };
  return (
    <CaptureBox opened={opened} onClose={close} label={title} footer={t('inbox.picker.keys')}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5} className={classes.heading}>
        {title}
      </Text>
      {path ? (
        <PagesStep
          path={path}
          onBack={() => setPath(null)}
          onPick={(page) => {
            setPath(null);
            onPick(page);
          }}
        />
      ) : (
        <PathsStep onPick={setPath} />
      )}
    </CaptureBox>
  );
}

function PathsStep({ onPick }: { onPick: (path: ProjectSummary) => void }) {
  const t = useT();
  const projects = useProjects();
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const last = useMemo(() => lastPathId(), []);
  const items = useMemo(() => {
    const all = [...(projects ?? [])].sort((a, b) => Number(b.id === last) - Number(a.id === last));
    return all.filter((p) => matches(p.title, query));
  }, [projects, last, query]);
  const keys = usePaletteKeys(items, onPick);

  return (
    <>
      <TextInput
        {...paletteFieldProps(listId, keys.active, items.length)}
        aria-label={t('inbox.picker.findPath')}
        placeholder={t('inbox.picker.findPath')}
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={keys.onKeyDown}
        variant="unstyled"
        size="md"
        data-autofocus
        classNames={{ input: classes.field }}
      />
      {projects === null ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : (
        <PaletteOptions
          id={listId}
          label={t('inbox.picker.paths')}
          items={items}
          active={keys.active}
          onActive={keys.setActive}
          onPick={onPick}
          getKey={(p) => p.id}
          empty={t('inbox.picker.noPaths')}
        >
          {(project) => (
            <>
              <ThemeIcon size={26} radius="xl" variant="light" color={project.color}>
                <PageGlyph icon={project.icon} size={15} />
              </ThemeIcon>
              <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
                {project.title}
              </Text>
              {project.id === last && (
                <Badge size="xs" variant="light" color="gray">
                  {t('inbox.picker.current')}
                </Badge>
              )}
            </>
          )}
        </PaletteOptions>
      )}
    </>
  );
}

function PagesStep({ path, onBack, onPick }: { path: ProjectSummary; onBack: () => void; onPick: (page: PickedPage) => void }) {
  const t = useT();
  const { state } = useProject(path.id);
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const items = useMemo(() => {
    if (state.status !== 'ready') return [];
    const { pages, rootPageId } = state.project;
    // The path's main page first, then the rest as they were added
    const ordered = [...pages].sort((a, b) => Number(b.id === rootPageId) - Number(a.id === rootPageId));
    return ordered.filter((p) => matches(displayTitle(p), query));
  }, [state, query]);
  const pick = (page: (typeof items)[number]) => onPick({ projectId: path.id, pageId: page.id, pageTitle: displayTitle(page) });
  const keys = usePaletteKeys(items, pick);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query === '') {
      event.preventDefault();
      onBack();
      return;
    }
    keys.onKeyDown(event);
  };

  return (
    <>
      <Group gap={6} wrap="nowrap" className={classes.crumb}>
        <button type="button" className={classes.back} onClick={onBack} aria-label={t('inbox.picker.back')}>
          <IconArrowLeft size={14} />
        </button>
        <Text size="sm" fw={600} truncate>
          {path.title}
        </Text>
      </Group>
      <TextInput
        {...paletteFieldProps(listId, keys.active, items.length)}
        aria-label={t('inbox.picker.findPage')}
        placeholder={t('inbox.picker.findPage')}
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        variant="unstyled"
        size="md"
        data-autofocus
        autoFocus
        classNames={{ input: classes.field }}
      />
      {state.status === 'loading' ? (
        <Group justify="center" gap="xs" p="md" role="status">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {t('inbox.picker.loading')}
          </Text>
        </Group>
      ) : state.status !== 'ready' ? (
        <Text size="sm" c="dimmed" p="md" role="status">
          {t('inbox.errors.pathGone')}
        </Text>
      ) : (
        <PaletteOptions
          id={listId}
          label={t('inbox.picker.pages', { path: path.title })}
          items={items}
          active={keys.active}
          onActive={keys.setActive}
          onPick={pick}
          getKey={(p) => p.id}
          empty={t('inbox.picker.noPages')}
        >
          {(page) => (
            <>
              <IconFileText size={16} aria-hidden color="var(--mantine-color-dimmed)" />
              <Text size="sm" truncate style={{ flex: 1 }}>
                {displayTitle(page)}
              </Text>
            </>
          )}
        </PaletteOptions>
      )}
    </>
  );
}
