'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { Button, Card, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { PageGlyph } from '@/features/paths/path';
import { mapHref, mapWithPageHref } from '@/shared/routes';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';
import { LeaveMenu } from './LeaveMenu';
import { OwnerMenu } from './OwnerMenu';

/** What a card does for its owner: dragged or moved to another project */
export interface OwnedCard {
  readonly projects: ReadonlyArray<Project>;
  /** This card is the one being dragged */
  readonly dragging: boolean;
  readonly onDrag: (path: PathSummary | null) => void;
  readonly onMove: (path: PathSummary, to: Project) => void;
}

/**
 * One path on the paths page: its look, progress, where to continue, and its menu. Its owner's card (`owned`)
 * moves between projects and can be deleted; a card from others names its owner and can only be left.
 */
export function PathCard({ path, owned }: { path: PathSummary; owned?: OwnedCard }) {
  const { studied, total, modules, orphans, next } = path;
  const [kindError, setKindError] = useState<string | null>(null);
  const t = useT();
  const href = mapHref(path.id);
  // A study shows its size only: no progress, nothing to continue; the whole card opens it
  const progress = path.kind === 'learningPath';

  return (
    <Card
      padding="lg"
      className={classes.card}
      // Dragged onto another project's group to move it there (Move to in the menu does the same)
      draggable={owned !== undefined}
      data-dragging={owned?.dragging || undefined}
      onDragStart={(event: DragEvent) => {
        if (!owned) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', path.title);
        owned.onDrag(path);
      }}
      onDragEnd={() => owned?.onDrag(null)}
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
            {!owned && (
              <Text size="sm" c="dimmed" truncate>
                {path.ownerName ? t('share.from.by', { name: path.ownerName }) : t('share.from.bySomeone')}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              {t('home.card.pages', { count: total })}
              {modules > 0 ? ` · ${t('home.card.modules', { count: modules })}` : ''}
              {orphans > 0 ? ` · ${t('home.card.orphans', { count: orphans })}` : ''}
            </Text>
          </Stack>
          {owned ? (
            <OwnerMenu path={path} projects={owned.projects} onMove={owned.onMove} onKindError={setKindError} />
          ) : (
            <LeaveMenu path={path} />
          )}
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
    </Card>
  );
}
