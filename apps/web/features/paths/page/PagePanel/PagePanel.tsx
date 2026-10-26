'use client';

import { ActionIcon, Anchor, Breadcrumbs, Card, Group, Menu, Stack, Tabs, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconArrowsDiagonal, IconBox, IconChevronRight, IconDotsVertical, IconTrash, IconX } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { canEdit } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import type { PathActions } from '@/useCases/paths';
import { PageContent } from '../PageContent/PageContent';
import { NotesTab } from '../PageNotes/NotesTab';
import { PageNotes } from '../PageNotes/PageNotes';
import { usePageNotes } from '../PageNotes/usePageNotes';
import { PageTitleInput } from '../PageContent/PageTitleInput';
import type { EditorFocus } from '@/features/paths/editor';
import { DeletePageModal } from '../DeletePageModal';
import { StudiedToggle } from '../StudiedToggle/StudiedToggle';
import { PageLook } from '../PageLook/PageLook';
import { moduleLook } from '../PageLook/PageLook.helpers';
import { useT } from '@/i18n/I18nProvider';
import classes from './PagePanel.module.css';
import { RelatedPages } from './RelatedPages';
import { usePagePanel } from './usePagePanel';
import type { PanelTab } from './usePagePanel';

/**
 * The selected page beside the map: where it sits, its title and markdown,
 * the pages related to it, the reader's own notes on it, and how it shows on the map.
 */

interface PagePanelProps {
  path: Path;
  page: Page;
  store: PathActions;
  /** `alternate`: opened with Cmd/Ctrl, as a full page */
  onSelect: (pageId: string, alternate?: boolean) => void;
  /** Grows the drawer into the full page, in place */
  onExpand?: () => void;
  onClose?: () => void;
  /** Without the card frame, inside the drawer */
  flat?: boolean;
  /** The page this one was reached from, inside the drawer */
  back?: { page: Page; onClick: () => void };
  /** Puts the cursor in the text on open: at a position, its start or its end */
  focusEditor?: EditorFocus | null;
  /** Follows the cursor in the text */
  onCursor?: (pos: number) => void;
}

export function PagePanel({ path, page, store, onSelect, onExpand, onClose, flat = false, back, focusEditor = null, onCursor }: PagePanelProps) {
  const t = useT();
  const { state, operations } = usePagePanel({ path, page, store, onSelect });
  const { isRoot, isOrphan, tree, trail, below, progress, related, subtitle } = state;
  const notes = usePageNotes(page, state.actions, () => operations.showTab('content'));

  return (
    <Card
      padding={0}
      className={`${classes.panel} ${flat ? classes.flat : ''}`}
      data-compact={state.compact || undefined}
      aria-label={t('page.panel.label')}
      component="aside"
      data-note-frame="window"
    >
      <Group justify="space-between" wrap="nowrap" px="lg" pt="md" gap="xs">
        <Group gap={4} wrap="nowrap" miw={0}>
        {back && (
          <Tooltip label={t('page.back', { title: displayTitle(back.page) })}>
            <ActionIcon variant="subtle" color="gray" onClick={back.onClick} aria-label={t('page.back', { title: displayTitle(back.page) })}>
              <IconArrowLeft size={17} />
            </ActionIcon>
          </Tooltip>
        )}
        {/* Where the page sits; its own title is right below, so the trail stops at its parent */}
        <Breadcrumbs separator={<IconChevronRight size={14} />} className={classes.trail} aria-label={t('page.panel.trail')}>
          {isRoot ? (
            <Text size="sm" fw={600}>
              {t('page.panel.centre')}
            </Text>
          ) : isOrphan ? (
            <Text size="sm" c="dimmed">
              {t('page.panel.orphans')}
            </Text>
          ) : (
            trailOf(trail.slice(0, -1)).map((p) =>
              p === null ? (
                <Text key="gap" size="sm" c="dimmed" aria-label={t('page.panel.morePages')}>
                  …
                </Text>
              ) : (
                <Anchor key={p.id} component="button" type="button" size="sm" c="dimmed" onClick={() => onSelect(p.id)} truncate maw={160}>
                  {displayTitle(p)}
                </Anchor>
              ),
            )
          )}
        </Breadcrumbs>
        {/* Folded, the header keeps only the page's title, in place of its trail */}
        <Text size="sm" fw={600} truncate className={classes.compactTitle}>
          {displayTitle(page)}
        </Text>
        </Group>
        <Group gap={2} wrap="nowrap">
          {onExpand && (
            <Tooltip label={t('page.panel.expandHint')}>
              <ActionIcon variant="subtle" color="gray" onClick={onExpand} aria-label={t('page.panel.expand')}>
                <IconArrowsDiagonal size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          {!isRoot && canEdit(path.access) && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label={t('page.menu.more')}>
                  <IconDotsVertical size={17} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconBox size={15} />} onClick={() => store.setLook(page.id, moduleLook(path, page, !page.module))}>
                  {t(page.module ? 'page.menu.showAsPage' : 'page.menu.showAsModule')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={operations.confirmDelete}>
                  {t('page.menu.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
          {onClose && (
            <Tooltip label={t('page.panel.closeHint')}>
              <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label={t('page.panel.close')}>
                <IconX size={17} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      <DeletePageModal
        opened={state.confirmingDelete}
        title={displayTitle(page)}
        orphansPages={!!below && below.total > 0}
        onClose={operations.cancelDelete}
        onDelete={operations.remove}
      />

      <div className={classes.head}>
        <Group gap="md" wrap="nowrap" align="flex-start" px="lg" pt="md">
          <PageLook path={path} page={page} store={store} size={60} />
          <Stack gap={2} miw={0} style={{ flex: 1 }}>
            <PageTitleInput
              key={page.id}
              path={path}
              page={page}
              actions={store}
              size={26}
              onEnter={operations.focusText}
            />
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          </Stack>
        </Group>

        {progress && (
          <Group gap="xs" px="lg" pt="md">
            <StudiedToggle
              path={path}
              page={page}
              onChange={(studied) => store.updatePage(page.id, { studied })}
              onShowText={() => operations.showTab('content')}
            />
          </Group>
        )}
      </div>

      <Tabs value={state.tab} onChange={(v) => operations.showTab((v as PanelTab) ?? 'content')} mt="md" className={classes.tabs}>
        <Tabs.List px="lg">
          <Tabs.Tab value="content">{t('page.tabs.content')}</Tabs.Tab>
          <Tabs.Tab value="related">{t('page.tabs.related', { count: related.length })}</Tabs.Tab>
          <NotesTab count={notes.list.notes.length} />
        </Tabs.List>

        <Tabs.Panel value="content" className={classes.body} onScroll={operations.scroll}>
          <PageContent
            key={page.id}
            path={path}
            page={page}
            actions={state.actions}
            notes={notes.text}
            showTitle={false}
            focusEditor={focusEditor}
            onCursor={onCursor}
            focusSignal={state.textFocus}
            // The panel's top padding: the toolbar sticks at the very top, so no text shows above it
            toolbarOffset={-16}
          />
          {/* Help while the page is empty; once there is writing it only takes room */}
          {!page.content.trim() && canEdit(path.access) && (
            <Text size="xs" c="dimmed" mt="md">
              {t('page.panel.emptyHelp')}
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="related" className={classes.body} onScroll={operations.scroll}>
          <RelatedPages path={path} page={page} tree={tree} related={related} store={store} onSelect={onSelect} />
        </Tabs.Panel>

        <Tabs.Panel value="notes" className={classes.body} onScroll={operations.scroll}>
          <PageNotes list={notes.list} path={path} page={page} actions={state.actions} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

/** Root, then the parent; deeper paths fold the middle into an ellipsis */
function trailOf(ancestors: ReadonlyArray<Page>): ReadonlyArray<Page | null> {
  return ancestors.length <= 2 ? ancestors : [ancestors[0], null, ancestors[ancestors.length - 1]];
}
