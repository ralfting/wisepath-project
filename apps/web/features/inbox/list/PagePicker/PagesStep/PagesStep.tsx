'use client';

import { Group, Loader, Text, TextInput } from '@mantine/core';
import { IconArrowLeft, IconFileText, IconSearch } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { displayTitle } from '@/i18n/title';
import { PaletteOptions } from '@/ui/Palette/PaletteOptions';
import classes from '../PagePicker.module.css';
import type { PickedPage } from '../PagePicker.helpers';
import { usePagesStep } from './usePagesStep';

/** The picker's second step: which page of the chosen path, filtered by what is typed */
export function PagesStep({ path, onBack, onPick }: { path: PathSummary; onBack: () => void; onPick: (page: PickedPage) => void }) {
  const t = useT();
  const { field, state, operations } = usePagesStep({ path, onBack, onPick });

  return (
    <>
      <Group gap={6} wrap="nowrap" className={classes.crumb}>
        <button type="button" className={classes.back} onClick={operations.back} aria-label={t('inbox.picker.back')}>
          <IconArrowLeft size={14} />
        </button>
        <Text size="sm" fw={600} truncate>
          {path.title}
        </Text>
      </Group>
      <TextInput
        ref={field}
        {...state.fieldProps}
        aria-label={t('inbox.picker.findPage')}
        placeholder={t('inbox.picker.findPage')}
        leftSection={<IconSearch size={16} />}
        value={state.query}
        onChange={(event) => operations.setQuery(event.currentTarget.value)}
        onKeyDown={operations.keyDown}
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
          id={state.listId}
          label={t('inbox.picker.pages', { path: path.title })}
          items={state.items}
          active={state.active}
          onActive={operations.setActive}
          onPick={operations.pick}
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
