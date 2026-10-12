'use client';

import { Popover, ScrollArea, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconUnlink } from '@tabler/icons-react';
import type { Project } from '@wisepath/domain/projects';
import { displayTitle, mapTree } from '@wisepath/domain/projects';
import { StatusIcon } from './MindMap';
import classes from './MapOrphans.module.css';

/**
 * MapOrphans
 * How many pages no link reaches, next to the map's progress in the header:
 * it is about the map as a whole, like the progress, not about viewing it.
 * Opens the list of those pages. Renders nothing when every page is linked.
 */
export function MapOrphans({
  project,
  selectedId,
  onSelect,
}: {
  project: Project;
  selectedId: string | null;
  onSelect: (pageId: string) => void;
}) {
  const tree = mapTree(project);
  const count = tree.orphans.length;
  if (count === 0) return null;
  const label = count === 1 ? "1 page isn't on the map" : `${count} pages aren't on the map`;

  return (
    <Popover position="bottom-end" width={280} shadow="md">
      <Popover.Target>
        <Tooltip label={label}>
          <UnstyledButton className={classes.button} aria-label={label}>
            <IconUnlink size={15} />
            <span>{count}</span>
            <Text span visibleFrom="lg" inherit>
              not on the map
            </Text>
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Text size="sm" fw={600} px={6} pt={2}>
          {label}
        </Text>
        <Text size="xs" c="dimmed" px={6} pb={6}>
          No link reaches {count === 1 ? 'it' : 'them'} from {displayTitle(tree.root.page)}. Link {count === 1 ? 'it' : 'them'} with
          [[Title]] in any page on the map.
        </Text>
        <ScrollArea.Autosize mah={260}>
          {tree.orphans.map((p) => (
            <UnstyledButton
              key={p.id}
              className={classes.orphan}
              data-selected={selectedId === p.id || undefined}
              onClick={() => onSelect(p.id)}
            >
              <StatusIcon status={p.studied ? 'done' : 'todo'} size={16} />
              <Text size="sm" truncate>
                {displayTitle(p)}
              </Text>
            </UnstyledButton>
          ))}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
