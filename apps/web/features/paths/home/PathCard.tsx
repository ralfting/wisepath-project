'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { ActionIcon, Button, Card, Group, Menu, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconDotsVertical, IconFolderShare, IconPlayerPlayFilled, IconTrash } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { useSetPathKind } from '@/useCases/paths';
import { KindSwitchItem } from '@/features/paths/path';
import { PageGlyph } from '@/features/paths/path';
import { mapHref, mapWithPageHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';
import { DeleteMapModal } from './DeleteMapModal';

/** One path on the paths page: its look, progress, where to continue, and its menu (move, delete) */
export function PathCard({
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
