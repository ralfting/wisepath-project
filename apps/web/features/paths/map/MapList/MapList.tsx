'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { MapNode, Path } from '@wisepath/domain/paths';
import { descendants, lookOf, mapTree, progressOf } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import { PageGlyph } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import { isGhost, withGhosts } from '../ghosts';
import { ActivityBadge } from '../ActivityBadge/ActivityBadge';
import { activityMarkLabel, activityMarkOf } from '../ActivityBadge/ActivityBadge.helpers';
import { StatusIcon } from '../StatusIcon';
import { OrphanTitle } from '../OrphanTitle';
import { PageIcon } from '../PageIcon';
import classes from './MapList.module.css';

/**
 * MapList
 * The map as an indented list, branch by branch in map order, with each
 * page's studied state, its activities and, for pages with branches, how many below are
 * studied; in a study, just the pages and how many are below. Orphans close
 * the list. Each row's + (or N on it) adds a page branching from it; the row at
 * the end adds one to the path's main page.
 */

interface MapListProps {
  /** Shown above the list (the search, which filters it too) */
  header?: ReactNode;
  path: Path;
  selectedId: string | null;
  currentId: string | null;
  /** A learning path shows what was studied; a study doesn't */
  progress: boolean;
  matchIds: ReadonlySet<string> | null;
  /** `alternate`: opened with Cmd/Ctrl, as a full page */
  onSelect: (pageId: string, alternate?: boolean) => void;
  /** The + on a row, and N: start adding a page branching from it */
  onAddBranch?: (pageId: string) => void;
  /** The page a branch is being added to, and the name field shown under its row */
  branch?: { from: string; prompt: ReactNode } | null;
}

export function MapList({ header, path, selectedId, currentId, progress, matchIds, onSelect, onAddBranch, branch = null }: MapListProps) {
  const t = useT();
  const tree = mapTree(path);
  // The rows add the pages named but not made; counts and progress keep reading the real tree
  const drawn = withGhosts(path, tree);
  const visible = (node: MapNode): boolean =>
    matchIds === null || matchIds.has(node.page.id) || node.children.some(visible);

  const ghostRow = (node: MapNode) => (
    <li key={node.page.id} className={classes.item}>
      <UnstyledButton
        className={classes.row}
        data-ghost
        onClick={(event) => onSelect(node.page.id, event.metaKey || event.ctrlKey)}
        aria-label={t('map.ghost.label', { title: node.page.title })}
        style={{ '--depth': node.depth - 1 } as CSSProperties}
      >
        <IconPlus size={16} stroke={1.8} aria-hidden="true" />
        <Text size="sm" c="dimmed" truncate style={{ flex: 1 }}>
          {node.page.title}
        </Text>
      </UnstyledButton>
    </li>
  );

  const row = (node: MapNode) => {
    if (isGhost(node.page.id)) return ghostRow(node);
    const look = lookOf(path, node.page.id, tree);
    const real = tree.nodes.get(node.page.id);
    const below = real && real.children.length ? progressOf(descendants(real)) : null;
    const status = node.page.studied ? 'done' : node.page.id === currentId ? 'current' : 'todo';
    const activity = activityMarkOf(path, node.page, progress);
    return (
      <li key={node.page.id} className={classes.item}>
        <UnstyledButton
          className={classes.row}
          data-module={node.page.module || undefined}
          data-selected={selectedId === node.page.id || undefined}
          onClick={(event) => onSelect(node.page.id, event.metaKey || event.ctrlKey)}
          onKeyDown={(event) => {
            if (!onAddBranch || event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
            event.preventDefault();
            onAddBranch(node.page.id);
          }}
          aria-keyshortcuts={onAddBranch ? 'N' : undefined}
          data-page-id={node.page.id}
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
          {activity && <ActivityBadge mark={activity} label={activityMarkLabel(t, activity)} />}
          {below && (
            <Text size="xs" c="dimmed">
              {progress ? `${below.studied}/${below.total}` : t('map.pages', { count: below.total })}
            </Text>
          )}
        </UnstyledButton>
        {onAddBranch && (
          // Shown while the row is pointed at or focused (CSS); the keyboard has N, so it is out of the tab order
          <UnstyledButton
            className={classes.plus}
            tabIndex={-1}
            aria-hidden="true"
            title={t('map.branch.add', { title: displayTitle(node.page) })}
            onClick={() => onAddBranch(node.page.id)}
          >
            <IconPlus size={14} stroke={2.4} />
          </UnstyledButton>
        )}
        {branch?.from === node.page.id && (
          <div className={classes.prompt} style={{ '--depth': node.depth } as CSSProperties}>
            {branch.prompt}
          </div>
        )}
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
        {drawn.root.children.length === 0 ? (
          <Text c="dimmed">{t('map.list.empty', { title: displayTitle(tree.root.page) })}</Text>
        ) : (
          <ul className={classes.list}>{drawn.root.children.filter(visible).map(row)}</ul>
        )}
        {onAddBranch && (
          <div>
            <UnstyledButton
              className={classes.row}
              data-page-id={tree.root.page.id}
              onClick={() => onAddBranch(tree.root.page.id)}
              aria-label={t('map.branch.add', { title: displayTitle(tree.root.page) })}
              style={{ '--depth': 0 } as CSSProperties}
            >
              <IconPlus size={18} stroke={1.8} color="var(--mantine-color-blue-6)" aria-hidden="true" />
              <Text size="sm" c="blue" fw={500}>
                {t('map.branch.listAdd')}
              </Text>
            </UnstyledButton>
            {branch?.from === tree.root.page.id && (
              <div className={classes.prompt} style={{ '--depth': 0 } as CSSProperties}>
                {branch.prompt}
              </div>
            )}
          </div>
        )}
        {orphans.length > 0 && (
          <section aria-label={t('map.list.orphans')}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.6} mb={4}>
              {t('map.list.orphansHeading')}
            </Text>
            <ul className={classes.list}>
              {orphans.map((p) => (
                <li key={p.id}>
                  <UnstyledButton
                    className={classes.row}
                    data-selected={selectedId === p.id || undefined}
                    onClick={(event) => onSelect(p.id, event.metaKey || event.ctrlKey)}
                    style={{ '--depth': 0 } as CSSProperties}
                  >
                    {progress ? <StatusIcon status={p.studied ? 'done' : 'todo'} /> : <PageIcon />}
                    <OrphanTitle path={path} page={p} />
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
