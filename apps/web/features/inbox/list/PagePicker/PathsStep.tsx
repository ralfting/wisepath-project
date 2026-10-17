'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Badge, Group, Loader, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconChevronRight, IconSearch } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { usePaths } from '@/useCases/paths';
import { PageGlyph } from '@/features/paths/path';
import { lastPathId } from '@/features/inbox/capture';
import { PaletteOptions } from '@/ui/Palette/PaletteOptions';
import { paletteFieldProps, usePaletteId, usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import classes from './PagePicker.module.css';
import { caretAt, matches } from './PagePicker.helpers';

/** The picker's first step: which path, filtered by what is typed, the last one used marked */
export function PathsStep({ onPick, marked }: { onPick: (path: PathSummary) => void; marked: string | null }) {
  const t = useT();
  const paths = usePaths();
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const last = useMemo(() => lastPathId(), []);
  const items = useMemo(() => {
    const all = [...(paths ?? [])].sort((a, b) => Number(b.id === last) - Number(a.id === last));
    return all.filter((p) => matches(p.title, query));
  }, [paths, last, query]);
  const keys = usePaletteKeys(items, onPick, Math.max(0, items.findIndex((p) => p.id === marked)));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const path = items[keys.active];
    if (event.key === 'ArrowRight' && path && caretAt(event.currentTarget, 'end')) {
      event.preventDefault();
      onPick(path);
      return;
    }
    keys.onKeyDown(event);
  };

  return (
    <>
      <TextInput
        {...paletteFieldProps(listId, keys.active, items.length)}
        aria-label={t('inbox.picker.findPath')}
        placeholder={t('inbox.picker.findPath')}
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        variant="unstyled"
        size="md"
        data-autofocus
        autoFocus
        classNames={{ input: classes.field }}
      />
      {paths === null ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : (
        <PaletteOptions
          id={listId}
          label={t('inbox.picker.paths')}
          items={items}
          active={keys.active}
          onActive={keys.setActive}
          onPick={onPick}
          getKey={(p) => p.id}
          empty={t('inbox.picker.noPaths')}
        >
          {(path) => (
            <>
              <ThemeIcon size={26} radius="xl" variant="light" color={path.color}>
                <PageGlyph icon={path.icon} size={15} />
              </ThemeIcon>
              <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
                {path.title}
              </Text>
              {path.id === last && (
                <Badge size="xs" variant="light" color="gray">
                  {t('inbox.picker.current')}
                </Badge>
              )}
              <IconChevronRight size={16} aria-hidden color="var(--mantine-color-dimmed)" />
            </>
          )}
        </PaletteOptions>
      )}
    </>
  );
}
