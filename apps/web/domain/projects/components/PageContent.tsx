'use client';

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Page, Project } from '../types/project.types';
import { displayTitle } from '../entities/project.entity';
import { references } from '../entities/levels';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { Box, Button, Group, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import classes from './PageContent.module.css';

/**
 * PageContent
 * One page, editable in place: title, markdown, the pages it leads to and
 * comes from (both read from its [[links]]), adding a page below, and delete.
 * Used by the map's side sheet and by the full-screen page.
 */

export interface PageActions {
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** Rewrites [[Old]] links across the project after a rename */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  openPage: (pageId: string) => void;
  /** Adds a page one level below `parentId` by writing its [[link]] there */
  addChild: (parentId: string, title: string) => void;
  /** Creates the page a [[link]] already points to, and opens it */
  createLinkedPage: (title: string) => void;
  deletePage: (pageId: string) => void;
}

interface PageContentProps {
  project: Project;
  page: Page;
  actions: PageActions;
  /** Focus the title on mount, for a page just created */
  isFresh?: boolean;
  /** Title size in px: larger on the full-screen page */
  titleSize?: number;
}

export function PageContent({ project, page, actions, isFresh = false, titleSize = 32 }: PageContentProps) {
  const [focusSignal, setFocusSignal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [childDraft, setChildDraft] = useState<string | null>(null);
  const titleAtFocus = useRef(page.title);

  const { leadsTo, comesFrom } = useMemo(() => {
    const refs = references(project);
    const byId = new Map(project.pages.map((p) => [p.id, p]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is Page => !!p);
    return {
      leadsTo: pick(refs.filter((r) => r.from === page.id).map((r) => r.to)),
      comesFrom: pick(refs.filter((r) => r.to === page.id).map((r) => r.from)),
    };
  }, [project, page.id]);

  const addChild = () => {
    const title = (childDraft ?? '').trim();
    if (title) actions.addChild(page.id, title);
    setChildDraft('');
  };

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <TextInput
          id={`title-${page.id}`}
          variant="unstyled"
          aria-label="Page title"
          value={page.title}
          autoFocus={isFresh}
          onFocus={() => {
            titleAtFocus.current = page.title;
          }}
          // Links to this page follow the new name once editing the title ends
          onBlur={() => actions.renameLinks(titleAtFocus.current, page.title)}
          onChange={(e) => actions.updatePage(page.id, { title: e.currentTarget.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setFocusSignal((n) => n + 1);
            }
          }}
          placeholder="Untitled page"
          classNames={{ input: classes.titleInput }}
          style={{ '--title-size': `${titleSize}px` } as CSSProperties}
        />
        <MarkdownEditor
          key={page.id}
          content={page.content}
          onChange={(content) => actions.updatePage(page.id, { content })}
          pages={project.pages}
          currentPageId={page.id}
          onOpenPage={actions.openPage}
          onLinkPage={() => {}}
          onCreatePage={actions.createLinkedPage}
          focusSignal={focusSignal}
        />
      </Stack>

      <Stack component="section" gap="sm" className={classes.section} aria-labelledby={`next-${page.id}`}>
        <Text id={`next-${page.id}`} fw={700} fz={15}>
          Leads to{' '}
          <Text span c="dimmed">
            ({leadsTo.length})
          </Text>
        </Text>
        {leadsTo.length > 0 && <PageLinks pages={leadsTo} onOpen={actions.openPage} />}

        {childDraft !== null ? (
          <TextInput
            id={`child-${page.id}`}
            autoFocus
            aria-label="Name of the page below"
            value={childDraft}
            onChange={(e) => setChildDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChild();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setChildDraft(null);
              }
            }}
            onBlur={() => {
              if (childDraft.trim()) actions.addChild(page.id, childDraft.trim());
              setChildDraft(null);
            }}
            placeholder="Name the next page"
            description="Enter adds it and keeps the field open for the next one. Esc closes."
            inputWrapperOrder={['input', 'description']}
            classNames={{ input: classes.nameInput }}
          />
        ) : (
          <Button variant="default" w="fit-content" leftSection={<IconPlus size={16} />} onClick={() => setChildDraft('')}>
            Add a page below
          </Button>
        )}

        {comesFrom.length > 0 && (
          <Stack gap={6} pt="xs">
            <Text fw={700} fz={15}>
              Comes from{' '}
              <Text span c="dimmed">
                ({comesFrom.length})
              </Text>
            </Text>
            <PageLinks pages={comesFrom} onOpen={actions.openPage} />
          </Stack>
        )}
        <Text size="xs" c="dimmed">
          To link a page that already exists, type [[ in the text.
        </Text>
      </Stack>

      <Box className={classes.section}>
        {confirmDelete ? (
          <Stack gap="sm">
            <Text size="sm">
              Delete <span className={classes.starName}>{displayTitle(page)}</span>? Links to it stay in other pages and
              show as missing. This can&apos;t be undone.
            </Text>
            <Group gap="xs">
              <Button color="red" onClick={() => actions.deletePage(page.id)}>
                Delete page
              </Button>
              <Button variant="subtle" color="gray" c="var(--mantine-color-text)" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </Group>
          </Stack>
        ) : (
          <Button
            variant="subtle"
            color="red"
            c="dimmed"
            size="compact-sm"
            px={0}
            leftSection={<IconTrash size={15} />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete page
          </Button>
        )}
      </Box>
    </Stack>
  );
}

function PageLinks({ pages, onOpen }: { pages: Page[]; onOpen: (pageId: string) => void }) {
  return (
    <Box component="ul" p={0} m={0} className={classes.linkList} style={{ listStyle: 'none' }}>
      {pages.map((p) => (
        <li key={p.id} className={classes.linkRow}>
          <UnstyledButton onClick={() => onOpen(p.id)} className={classes.starName} fz={15} w="100%" ta="left">
            {displayTitle(p)}
          </UnstyledButton>
        </li>
      ))}
    </Box>
  );
}
