'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import type { MapNode, Project } from '@wisepath/domain/projects';
import { descendants, displayTitle, lookOf, mapTree, progressOf } from '@wisepath/domain/projects';
import { PageGlyph } from '@/features/shared/look';
import { PageIcon, StatusIcon } from './MindMap';
import classes from './MapList.module.css';

/**
 * MapList
 * The map as an indented list, branch by branch in map order, with each
 * page's studied state and, for pages with branches, how many below are
 * studied; in a study, just the pages and how many are below. Orphans close
 * the list.
 */

interface MapListProps {
  /** Shown above the list (the search, which filters it too) */
  header?: ReactNode;
  project: Project;
  selectedId: string | null;
  currentId: string | null;
  /** A learning path shows what was studied; a study doesn't */
  progress: boolean;
  matchIds: Set<string> | null;
  onSelect: (pageId: string) => void;
}

export function MapList({ header, project, selectedId, currentId, progress, matchIds, onSelect }: MapListProps) {
  const tree = mapTree(project);
  const visible = (node: MapNode): boolean =>
    matchIds === null || matchIds.has(node.page.id) || node.children.some(visible);

  const row = (node: MapNode) => {
    const look = lookOf(project, node.page.id, tree);
    const below = node.children.length ? progressOf(descendants(node)) : null;
    const status = node.page.studied ? 'done' : node.page.id === currentId ? 'current' : 'todo';
    return (
      <li key={node.page.id}>
        <UnstyledButton
          className={classes.row}
          data-module={node.page.module || undefined}
          data-selected={selectedId === node.page.id || undefined}
          onClick={() => onSelect(node.page.id)}
          style={{ '--depth': node.depth - 1 } as CSSProperties}
        >
          {node.page.module ? (
            <ThemeIcon size={30} radius="xl" variant="light" color={look.color}>
              <PageGlyph icon={look.icon} size={16} />
            </ThemeIcon>
          ) : progress ? (
            <StatusIcon status={status} />
          ) : (
            <PageIcon />
          )}
          <Text size="sm" fw={node.page.module ? 700 : 400} truncate style={{ flex: 1 }}>
            {displayTitle(node.page)}
          </Text>
          {below && (
            <Text size="xs" c="dimmed">
              {progress ? `${below.studied}/${below.total}` : `${below.total} ${below.total === 1 ? 'page' : 'pages'}`}
            </Text>
          )}
        </UnstyledButton>
        {node.children.length > 0 && <ul className={classes.list}>{node.children.filter(visible).map(row)}</ul>}
      </li>
    );
  };

  const orphans = tree.orphans.filter((p) => matchIds === null || matchIds.has(p.id));

  return (
    <ScrollArea h="100%">
      {/* Same inset as the map's tools, so switching views leaves them in place */}
      <Stack gap="lg" p="sm" pb="lg">
        {header && <div>{header}</div>}
        {tree.root.children.length === 0 ? (
          <Text c="dimmed">
            Nothing on the map yet. Select {displayTitle(tree.root.page)} and type / in its content to add a page.
          </Text>
        ) : (
          <ul className={classes.list}>{tree.root.children.filter(visible).map(row)}</ul>
        )}
        {orphans.length > 0 && (
          <section aria-label="Orphans">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.6} mb={4}>
              Orphans · no link reaches them
            </Text>
            <ul className={classes.list}>
              {orphans.map((p) => (
                <li key={p.id}>
                  <UnstyledButton
                    className={classes.row}
                    data-selected={selectedId === p.id || undefined}
                    onClick={() => onSelect(p.id)}
                    style={{ '--depth': 0 } as CSSProperties}
                  >
                    {progress ? <StatusIcon status={p.studied ? 'done' : 'todo'} /> : <PageIcon />}
                    <Text size="sm" truncate>
                      {displayTitle(p)}
                    </Text>
                  </UnstyledButton>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Stack>
    </ScrollArea>
  );
}
