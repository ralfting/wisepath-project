'use client';

import { useMemo, useState } from 'react';
import { Group, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { Page, Path } from '@wisepath/domain/paths';
import { PageId, branchTargets, lookOf, mapTree } from '@wisepath/domain/paths';
import { matchesAll } from '@wisepath/domain/search';
import { useT } from '@/i18n/I18nProvider';
import { displayTitle } from '@/i18n/title';
import { PaletteOptions } from '@/ui/Palette/PaletteOptions';
import { paletteFieldProps, usePaletteId, usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import { PageGlyph } from '@/features/paths/path';

/** The picker's search and the pages matching it, each indented by its depth on the map */
export function BranchOptions({ path, pageId, onPick }: { path: Path; pageId: string; onPick: (parentId: string) => void }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const tree = useMemo(() => mapTree(path), [path]);
  const targets = useMemo(() => branchTargets(path, PageId.make(pageId)), [path, pageId]);
  const items = useMemo(() => (query.trim() ? targets.filter((p) => matchesAll(displayTitle(p), query)) : targets), [targets, query]);
  const pick = (page: Page) => onPick(page.id);
  const keys = usePaletteKeys(items, pick);

  return (
    <>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5} px="md" pt="sm">
        {t('page.related.move.title')}
      </Text>
      <TextInput
        {...paletteFieldProps(listId, keys.active, items.length)}
        aria-label={t('page.related.move.find')}
        placeholder={t('page.related.move.find')}
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={keys.onKeyDown}
        variant="unstyled"
        size="md"
        px="xs"
        data-autofocus
        autoFocus
      />
      <PaletteOptions
        id={listId}
        label={t('page.related.move.pages')}
        items={items}
        active={keys.active}
        onActive={keys.setActive}
        onPick={pick}
        getKey={(p) => p.id}
        empty={t('page.related.move.noPages')}
      >
        {(page) => {
          const look = lookOf(path, page.id, tree);
          // The map's shape, so two pages with the same words are told apart by where they sit
          const depth = query.trim() ? 0 : (tree.nodes.get(page.id)?.depth ?? 0);
          return (
            <Group gap="sm" wrap="nowrap" miw={0} style={{ flex: 1, paddingInlineStart: `calc(${depth} * var(--mantine-spacing-md))` }}>
              <ThemeIcon size={24} radius="xl" variant="light" color={look.color}>
                <PageGlyph icon={page.module || page.id === path.rootPageId ? look.icon : 'book'} size={13} />
              </ThemeIcon>
              <Text size="sm" truncate style={{ flex: 1 }}>
                {displayTitle(page)}
              </Text>
            </Group>
          );
        }}
      </PaletteOptions>
    </>
  );
}
