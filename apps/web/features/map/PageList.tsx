'use client';

import type { ReactNode } from 'react';
import { Center, Group, Table, Text, UnstyledButton } from '@mantine/core';
import classes from './PageList.module.css';
import type { Page, Project } from '@wisepath/domain/projects';
import { displayTitle, wordCount } from '@wisepath/domain/projects';
import { computeLevels, references } from '@wisepath/domain/projects';

/**
 * PageList
 * The same pages as a table, in chart order. Columns stay fixed; only the cells change.
 */

interface PageListProps {
  project: Project;
  selectedId: string | null;
  matchIds: Set<string> | null;
  onOpen: (pageId: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

export function PageList({ project, selectedId, matchIds, onOpen }: PageListProps) {
  // Top-down order: level by level, pages not linked yet last
  const { levels, apart, levelOf } = computeLevels(project);
  const refs = references(project);
  const byId = new Map(project.pages.map((p) => [p.id, p]));
  const ordered = [...levels.flat(), ...apart].map((id) => byId.get(id) as Page);
  const rows = matchIds ? ordered.filter((p) => matchIds.has(p.id)) : ordered;

  if (project.pages.length === 0) {
    return <EmptyMessage>This project has no pages yet. Use Add page to add one.</EmptyMessage>;
  }
  if (rows.length === 0) {
    return <EmptyMessage>No page matches your search. Clear it to see every page.</EmptyMessage>;
  }

  return (
    <Table.ScrollContainer minWidth={640} h="100%" className={classes.frame}>
      <Table stickyHeader highlightOnHover verticalSpacing="xs" horizontalSpacing="md" fz="sm">
        <Table.Caption className={classes.srOnly}>Pages of {project.title}</Table.Caption>
        <Table.Thead>
          <Table.Tr c="dimmed" fz={13}>
            <Table.Th w={80} fw={400}>Level</Table.Th>
            <Table.Th fw={400}>Page</Table.Th>
            <Table.Th w={128} fw={400}>Studied</Table.Th>
            <Table.Th w={112} fw={400} ta="right">Words</Table.Th>
            <Table.Th fw={400}>Comes from</Table.Th>
            <Table.Th w={96} fw={400} ta="right">Edited</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((page) => (
            <Table.Tr key={page.id} bg={page.id === selectedId ? 'var(--mantine-color-atlas-1)' : undefined}>
              <Table.Td c="dimmed">{levelOf.get(page.id) ?? 'Not linked'}</Table.Td>
              <Table.Td>
                <UnstyledButton
                  onClick={() => onOpen(page.id)}
                  aria-current={page.id === selectedId ? 'true' : undefined}
                  className={classes.pageName}
                >
                  {displayTitle(page)}
                </UnstyledButton>
              </Table.Td>
              <Table.Td>
                <StudiedCell page={page} />
              </Table.Td>
              <Table.Td ta="right">{wordCount(page.content)}</Table.Td>
              <Table.Td c="dimmed" maw={280} className={classes.truncate}>
                {refs
                  .filter((r) => r.to === page.id)
                  .map((r) => displayTitle(byId.get(r.from) as Page))
                  .join(', ') || (page.id === project.startPageId ? 'Start' : 'Nothing yet')}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {dateFormat.format(new Date(page.updatedAt))}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function StudiedCell({ page }: { page: Page }) {
  return (
    <Group gap={8} c={page.studied ? undefined : 'dimmed'} wrap="nowrap">
      <svg width="12" height="12" aria-hidden="true">
        {page.studied ? (
          <circle cx="6" cy="6" r="5" fill="var(--mantine-color-atlas-7)" />
        ) : (
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        )}
      </svg>
      {page.studied ? 'Studied' : 'Not yet'}
    </Group>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <Center h="100%" p="xl" className={classes.empty}>
      <Text size="sm" c="dimmed" ta="center">
        {children}
      </Text>
    </Center>
  );
}
