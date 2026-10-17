'use client';

import { Badge, Group, Loader, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconChevronRight, IconSearch } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { PageGlyph } from '@/features/paths/path';
import { PaletteOptions } from '@/ui/Palette/PaletteOptions';
import classes from '../PagePicker.module.css';
import { usePathsStep } from './usePathsStep';

/** The picker's first step: which path, filtered by what is typed, the last one used marked */
export function PathsStep({ onPick, marked }: { onPick: (path: PathSummary) => void; marked: string | null }) {
  const t = useT();
  const { field, state, operations } = usePathsStep({ onPick, marked });

  return (
    <>
      <TextInput
        ref={field}
        {...state.fieldProps}
        aria-label={t('inbox.picker.findPath')}
        placeholder={t('inbox.picker.findPath')}
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
      {state.loading ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : (
        <PaletteOptions
          id={state.listId}
          label={t('inbox.picker.paths')}
          items={state.items}
          active={state.active}
          onActive={operations.setActive}
          onPick={operations.pick}
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
              {path.id === state.last && (
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
