'use client';

import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Card,
  Group,
  Menu,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpLeft,
  IconArrowsDiagonal,
  IconBox,
  IconChevronRight,
  IconDotsVertical,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Page, Path, Relation } from '@wisepath/domain/paths';
import { branchProgress, lookOf, mapTree, trailTo, pathProgress, relatedPages } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import type { PathActions } from '@/useCases/paths';
import { PageGlyph, pointAtRelated } from '@/features/paths/path';
import { PageContent, PageTitleInput } from './PageContent';
import type { EditorFocus } from '@/features/paths/editor';
import type { PageActions } from './PageContent';
import { DeletePageModal } from './DeletePageModal';
import { StudiedToggle } from './StudiedToggle';
import { PageLook, moduleLook } from './PageLook';
import { useT } from '@/i18n/I18nProvider';
import { useRememberOpened } from '@/useCases/search';
import classes from './PagePanel.module.css';

/**
 * PagePanel
 * The selected page beside the map: where it sits, its title and markdown,
 * the pages related to it, and how it shows on the map.
 */

interface PagePanelProps {
  path: Path;
  page: Page;
  store: PathActions;
  onSelect: (pageId: string) => void;
  /** Grows the drawer into the full page, in place */
  onExpand?: () => void;
  onClose?: () => void;
  /** Without the card frame, inside the drawer */
  flat?: boolean;
  /** The page this one was reached from, inside the drawer */
  back?: { page: Page; onClick: () => void };
  /** Puts the cursor in the text on open: at a position, its start or its end */
  focusEditor?: EditorFocus | null;
  /** Puts the focus on the title on open instead */
  focusTitle?: boolean;
  /** Follows the cursor in the text */
  onCursor?: (pos: number) => void;
}

type PanelTab = 'content' | 'related';

/**
 * The related pages, grouped by how they connect, in a fixed order: up the
 * branch, down it, then [[links]] out and in. Each arrow reads from this page,
 * so a section says its direction once instead of every row repeating it.
 */
const RELATION_SECTIONS: ReadonlyArray<{ relation: Relation; icon: Icon }> = [
  { relation: 'parent', icon: IconArrowUpLeft },
  { relation: 'child', icon: IconArrowDownRight },
  { relation: 'linksTo', icon: IconArrowRight },
  { relation: 'linkedFrom', icon: IconArrowLeft },
];

export function PagePanel({ path, page, store, onSelect, onExpand, onClose, flat = false, back, focusEditor = null, focusTitle = false, onCursor }: PagePanelProps) {
  const t = useT();
  const [tab, setTab] = useState<PanelTab>('content');
  // Offered again by the search palette (⌘P), across paths
  useRememberOpened({ pathId: path.id, pageId: page.id, title: page.title, pathTitle: path.title });
  // A related page still pointed at when the panel goes (another page opened, the drawer closed) lets go
  useEffect(() => () => pointAtRelated(null), [page.id]);
  // Enter in the title moves on to the text
  const [textFocus, setTextFocus] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRoot = page.id === path.rootPageId;
  const tree = mapTree(path);
  const isOrphan = !tree.nodes.has(page.id);
  const trail = trailTo(path, page.id, tree);
  const related = relatedPages(path, page.id);
  const below = branchProgress(path, page.id);
  const branchFrom = trail.length > 1 ? trail[trail.length - 2] : null;

  const pageActions: PageActions = {
    updatePage: store.updatePage,
    beginRename: store.beginRename,
    renameLinks: store.renameLinks,
    openPage: onSelect,
    createLinkedPage: (title) => onSelect(store.createPage(title).id),
    createPage: (title) => void store.createPage(title),
  };

  const kind = t(isRoot ? 'page.kind.path' : isOrphan ? 'page.kind.orphan' : page.module ? 'page.kind.module' : 'page.kind.page');
  // A learning path counts what below was studied; a study, how many pages are below
  const progress = path.kind === 'learningPath';
  const belowText =
    !below || below.total === 0
      ? null
      : progress
        ? t('page.below.studied', { studied: below.studied, count: below.total })
        : t('page.below.pages', { count: below.total });
  const subtitle = belowText ? `${kind} · ${belowText}` : kind;

  return (
    <Card
      padding={0}
      className={`${classes.panel} ${flat ? classes.flat : ''}`}
      aria-label={t('page.panel.label')}
      component="aside"
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
        </Group>
        <Group gap={2} wrap="nowrap">
          {onExpand && (
            <Tooltip label={t('page.panel.expandHint')}>
              <ActionIcon variant="subtle" color="gray" onClick={onExpand} aria-label={t('page.panel.expand')}>
                <IconArrowsDiagonal size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          {!isRoot && (
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
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setConfirmDelete(true)}>
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
        opened={confirmDelete}
        title={displayTitle(page)}
        orphansPages={!!below && below.total > 0}
        onClose={() => setConfirmDelete(false)}
        onDelete={() => {
          setConfirmDelete(false);
          store.deletePage(page.id);
          onSelect(branchFrom?.id ?? path.rootPageId);
        }}
      />

      <Group gap="md" wrap="nowrap" align="flex-start" px="lg" pt="md">
        <PageLook path={path} page={page} store={store} size={60} />
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <PageTitleInput
            key={page.id}
            path={path}
            page={page}
            actions={store}
            size={26}
            autoFocus={focusTitle}
            onEnter={() => {
              setTab('content');
              setTextFocus((n) => n + 1);
            }}
          />
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
      </Group>

      {!isRoot && progress && (
        <Group gap="xs" px="lg" pt="md">
          <StudiedToggle
            studied={page.studied}
            onChange={(studied) => store.updatePage(page.id, { studied })}
            progress={{ map: path.title, ...pathProgress(path) }}
          />
        </Group>
      )}

      <Tabs value={tab} onChange={(v) => setTab((v as PanelTab) ?? 'content')} mt="md" className={classes.tabs}>
        <Tabs.List px="lg">
          <Tabs.Tab value="content">{t('page.tabs.content')}</Tabs.Tab>
          <Tabs.Tab value="related">{t('page.tabs.related', { count: related.length })}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="content" className={classes.body}>
          <PageContent
            key={page.id}
            path={path}
            page={page}
            actions={pageActions}
            showTitle={false}
            focusEditor={focusEditor}
            onCursor={onCursor}
            focusSignal={textFocus}
            // The panel's top padding: the toolbar sticks at the very top, so no text shows above it
            toolbarOffset={-16}
          />
          {/* Help while the page is empty; once there is writing it only takes room */}
          {!page.content.trim() && (
            <Text size="xs" c="dimmed" mt="md">
              {t('page.panel.emptyHelp')}
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="related" className={classes.body}>
          {related.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('page.related.empty')}
            </Text>
          ) : (
            <Stack gap="lg">
              {RELATION_SECTIONS.map(({ relation, icon: Arrow }) => {
                const pages = related.filter((r) => r.relation === relation);
                if (pages.length === 0) return null;
                const label = t(`page.related.${relation}.label`);
                return (
                  <section key={relation} aria-label={`${label} (${pages.length})`}>
                    <Group gap={6} wrap="nowrap" className={classes.relationHead}>
                      <Arrow size={15} stroke={2} className={classes.relationArrow} aria-hidden />
                      <Text size="xs" fw={700} className={classes.relationLabel}>
                        {label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {pages.length}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb={4}>
                      {t(`page.related.${relation}.hint`)}
                    </Text>
                    <Stack gap={0}>
                      {pages.map(({ page: p }) => {
                        const l = lookOf(path, p.id, tree);
                        return (
                          <UnstyledButton
                            key={p.id}
                            className={classes.related}
                            onClick={() => onSelect(p.id)}
                            // The map beside the drawer singles out this page and its link to the open one
                            onPointerEnter={() => pointAtRelated(p.id)}
                            onPointerLeave={() => pointAtRelated(null)}
                            onFocus={() => pointAtRelated(p.id)}
                            onBlur={() => pointAtRelated(null)}
                          >
                            <ThemeIcon size={28} radius="xl" variant="light" color={l.color}>
                              <PageGlyph icon={p.module || p.id === path.rootPageId ? l.icon : 'book'} size={15} />
                            </ThemeIcon>
                            <Text size="sm" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                              {displayTitle(p)}
                            </Text>
                            <IconChevronRight size={16} className={classes.relatedOpen} aria-hidden />
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </section>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

      </Tabs>
    </Card>
  );
}

/** Root, then the parent; deeper paths fold the middle into an ellipsis */
function trailOf(ancestors: ReadonlyArray<Page>): ReadonlyArray<Page | null> {
  return ancestors.length <= 2 ? ancestors : [ancestors[0], null, ancestors[ancestors.length - 1]];
}
