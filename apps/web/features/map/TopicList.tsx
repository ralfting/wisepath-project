'use client';

import { Progress, ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, lookOf, progressOf, structureOf } from '@wisepath/domain/projects';
import { PageGlyph } from '@/features/shared/look';
import { StatusIcon } from './MindMap';
import classes from './TopicList.module.css';

/**
 * TopicList
 * The map as a list: each module with its progress, then its topics.
 */

interface TopicListProps {
  project: Project;
  selectedId: string | null;
  currentId: string | null;
  matchIds: Set<string> | null;
  onSelect: (pageId: string) => void;
}

export function TopicList({ project, selectedId, currentId, matchIds, onSelect }: TopicListProps) {
  const { modules } = structureOf(project);
  const visible = (id: string) => matchIds === null || matchIds.has(id);

  if (modules.length === 0) {
    return (
      <Text c="dimmed" p="xl">
        No modules yet. Select the map&apos;s centre page and add the first module.
      </Text>
    );
  }

  return (
    <ScrollArea h="100%">
      <Stack gap="lg" p="lg">
        {modules
          .filter((m) => visible(m.page.id) || m.topics.some((t) => visible(t.id)))
          .map((m) => {
            const look = lookOf(project, m.page.id);
            const { studied, total } = progressOf(m.topics);
            return (
              <section key={m.page.id} aria-label={displayTitle(m.page)}>
                <UnstyledButton
                  className={classes.module}
                  data-selected={selectedId === m.page.id || undefined}
                  onClick={() => onSelect(m.page.id)}
                >
                  <ThemeIcon size={36} radius="xl" variant="light" color={look.color}>
                    <PageGlyph icon={look.icon} size={19} />
                  </ThemeIcon>
                  <Text fw={700} style={{ flex: 1 }} truncate>
                    {displayTitle(m.page)}
                  </Text>
                  <Progress value={total ? (studied / total) * 100 : 0} color={look.color} size="sm" w={96} aria-hidden />
                  <Text size="sm" c="dimmed" w={40} ta="right">
                    {studied}/{total}
                  </Text>
                </UnstyledButton>
                <Stack gap={0} mt={4} pl={46}>
                  {m.topics.filter((t) => visible(t.id)).map((t) => {
                    const status = t.studied ? 'done' : t.id === currentId ? 'current' : 'todo';
                    return (
                      <UnstyledButton
                        key={t.id}
                        className={classes.topic}
                        data-selected={selectedId === t.id || undefined}
                        onClick={() => onSelect(t.id)}
                      >
                        <StatusIcon status={status} />
                        <Text size="sm" truncate>
                          {displayTitle(t)}
                        </Text>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              </section>
            );
          })}
      </Stack>
    </ScrollArea>
  );
}
