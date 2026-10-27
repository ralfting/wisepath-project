'use client';

import { useState } from 'react';
import { Button, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowLeftDashed,
  IconArrowRight,
  IconArrowRightDashed,
  IconArrowUpLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { MapTree, Page, Path, Relation, RelatedPage } from '@wisepath/domain/paths';
import { canEdit, lookOf } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';
import type { PathActions } from '@/useCases/paths';
import { PageGlyph, pointAtRelated } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import { BranchPicker } from './BranchPicker/BranchPicker';
import classes from './PagePanel.module.css';

/**
 * The related pages, grouped by how they connect, in a fixed order: up the
 * branch, down it, [[links]] out and in, then @[[citations]] out and in (dashed,
 * as on the map). Each arrow reads from this page,
 * so a section says its direction once instead of every row repeating it.
 */
const RELATION_SECTIONS: ReadonlyArray<{ relation: Relation; icon: Icon }> = [
  { relation: 'parent', icon: IconArrowUpLeft },
  { relation: 'child', icon: IconArrowDownRight },
  { relation: 'linksTo', icon: IconArrowRight },
  { relation: 'linkedFrom', icon: IconArrowLeft },
  { relation: 'cites', icon: IconArrowRightDashed },
  { relation: 'citedBy', icon: IconArrowLeftDashed },
];

interface RelatedPagesProps {
  path: Path;
  page: Page;
  tree: MapTree;
  related: ReadonlyArray<RelatedPage>;
  store: PathActions;
  onSelect: (pageId: string) => void;
}

/** The page panel's Related tab: the pages around this one, and where it branches from, which an editor can change */
export function RelatedPages({ path, page, tree, related, store, onSelect }: RelatedPagesProps) {
  const t = useT();
  const [moving, setMoving] = useState(false);
  // Any page but the root can move; an unlinked one gets its first place on the map this way
  const movable = page.id !== path.rootPageId && canEdit(path.access);
  const sections = RELATION_SECTIONS.map((section) => ({ ...section, pages: related.filter((r) => r.relation === section.relation) })).filter(
    ({ relation, pages }) => pages.length > 0 || (relation === 'parent' && movable),
  );

  if (sections.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('page.related.empty')}
      </Text>
    );
  }
  return (
    <Stack gap="lg">
      {sections.map(({ relation, icon: Arrow, pages }) => {
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
              {relation === 'parent' && movable && (
                <Button variant="subtle" size="compact-xs" ml="auto" onClick={() => setMoving(true)} aria-label={t('page.related.parent.changeLabel')}>
                  {t(pages.length > 0 ? 'page.related.parent.change' : 'page.related.parent.choose')}
                </Button>
              )}
            </Group>
            <Text size="xs" c="dimmed" mb={4}>
              {t(pages.length > 0 ? `page.related.${relation}.hint` : 'page.related.parent.none')}
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
      {movable && (
        <BranchPicker
          opened={moving}
          path={path}
          pageId={page.id}
          onClose={() => setMoving(false)}
          onPick={(parentId) => {
            setMoving(false);
            store.moveBranch(page.id, parentId);
          }}
        />
      )}
    </Stack>
  );
}
