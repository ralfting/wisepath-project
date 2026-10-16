'use client';

import { Popover, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { IconUnlink } from '@tabler/icons-react';
import type { Path } from '@wisepath/domain/paths';
import { mapTree } from '@wisepath/domain/paths';
import { displayTitle } from '@/features/shared/title';
import { useT } from '@/i18n/I18nProvider';
import { StatusIcon } from './MindMap';
import classes from './MapOrphans.module.css';

/**
 * MapOrphans
 * How many pages no link reaches, under the map's view toggle and search.
 * Opens the list of those pages. Renders nothing when every page is linked.
 */
export function MapOrphans({
  path,
  selectedId,
  onSelect,
}: {
  path: Path;
  selectedId: string | null;
  onSelect: (pageId: string) => void;
}) {
  const t = useT();
  const tree = mapTree(path);
  const count = tree.orphans.length;
  if (count === 0) return null;
  const label = t('map.orphans.count', { count });

  return (
    <Popover position="bottom-start" width={280} shadow="md">
      <Popover.Target>
        <UnstyledButton className={classes.button}>
          <IconUnlink size={15} aria-hidden="true" />
          <span>{label}</span>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Text size="sm" fw={600} px={6} pt={2}>
          {label}
        </Text>
        <Text size="xs" c="dimmed" px={6} pb={6}>
          {t('map.orphans.hint', { count, title: displayTitle(tree.root.page) })}
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
