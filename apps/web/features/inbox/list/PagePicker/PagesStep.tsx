'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Group, Loader, Text, TextInput } from '@mantine/core';
import { IconArrowLeft, IconFileText, IconSearch } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { usePath } from '@/useCases/paths';
import { displayTitle } from '@/i18n/title';
import { PaletteOptions, paletteFieldProps, usePaletteId, usePaletteKeys } from '@/features/inbox/capture';
import classes from './PagePicker.module.css';
import { caretAt, matches } from './PagePicker.helpers';
import type { PickedPage } from './PagePicker.helpers';

/** The picker's second step: which page of the chosen path, filtered by what is typed */
export function PagesStep({ path, onBack, onPick }: { path: PathSummary; onBack: () => void; onPick: (page: PickedPage) => void }) {
  const t = useT();
  const { state } = usePath(path.id);
  const [query, setQuery] = useState('');
  const listId = usePaletteId();
  const items = useMemo(() => {
    if (state.status !== 'ready') return [];
    const { pages, rootPageId } = state.path;
    // The path's main page first, then the rest as they were added
    const ordered = [...pages].sort((a, b) => Number(b.id === rootPageId) - Number(a.id === rootPageId));
    return ordered.filter((p) => matches(displayTitle(p), query));
  }, [state, query]);
  const pick = (page: (typeof items)[number]) => onPick({ pathId: path.id, pageId: page.id, pageTitle: displayTitle(page) });
  const keys = usePaletteKeys(items, pick);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Backspace' && query === '') || (event.key === 'ArrowLeft' && caretAt(event.currentTarget, 'start'))) {
      event.preventDefault();
      onBack();
      return;
    }
    keys.onKeyDown(event);
  };

  return (
    <>
      <Group gap={6} wrap="nowrap" className={classes.crumb}>
        <button type="button" className={classes.back} onClick={onBack} aria-label={t('inbox.picker.back')}>
          <IconArrowLeft size={14} />
        </button>
        <Text size="sm" fw={600} truncate>
          {path.title}
        </Text>
      </Group>
      <TextInput
        {...paletteFieldProps(listId, keys.active, items.length)}
        aria-label={t('inbox.picker.findPage')}
        placeholder={t('inbox.picker.findPage')}
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
      {state.status === 'loading' ? (
        <Group justify="center" gap="xs" p="md" role="status">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {t('inbox.picker.loading')}
          </Text>
        </Group>
      ) : state.status !== 'ready' ? (
        <Text size="sm" c="dimmed" p="md" role="status">
          {t('inbox.errors.pathGone')}
        </Text>
      ) : (
        <PaletteOptions
          id={listId}
          label={t('inbox.picker.pages', { path: path.title })}
          items={items}
          active={keys.active}
          onActive={keys.setActive}
          onPick={pick}
          getKey={(p) => p.id}
          empty={t('inbox.picker.noPages')}
        >
          {(page) => (
            <>
              <IconFileText size={16} aria-hidden color="var(--mantine-color-dimmed)" />
              <Text size="sm" truncate style={{ flex: 1 }}>
                {displayTitle(page)}
              </Text>
            </>
          )}
        </PaletteOptions>
      )}
    </>
  );
}
