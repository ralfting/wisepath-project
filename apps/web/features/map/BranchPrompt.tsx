'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Paper, Text, TextInput } from '@mantine/core';
import { IconFilePlus } from '@tabler/icons-react';
import type { Page } from '@wisepath/domain/projects';
import { findPageByTitle } from '@wisepath/domain/projects';
import { displayTitle } from '@/features/shared/title';
import { useT } from '@/i18n/I18nProvider';
import classes from './BranchPrompt.module.css';

/**
 * BranchPrompt
 * The name field the map's + opens beside a page. Enter adds the branch and empties the field for the next one;
 * Cmd/Ctrl+Enter adds it and opens it; Esc, or a click elsewhere, closes it. A name another page has links that
 * page instead, and says so before Enter.
 */

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+';

export function BranchPrompt({
  parent,
  pages,
  style,
  className,
  onSubmit,
  onClose,
}: {
  parent: Page;
  pages: ReadonlyArray<Page>;
  style?: CSSProperties;
  className?: string;
  /** `open`: go to the page once it is added */
  onSubmit: (title: string, open: boolean) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const title = name.trim();
  const existing = title ? findPageByTitle(pages, title) : undefined;
  const isParent = existing?.id === parent.id;
  const note = isParent
    ? t('map.branch.isThis')
    : existing
      ? t('map.branch.exists', { title: displayTitle(existing) })
      : t('map.branch.hint', { mod: MOD });

  return (
    <Paper
      withBorder
      shadow="md"
      p="sm"
      role="dialog"
      aria-label={t('map.branch.dialog', { title: displayTitle(parent) })}
      className={`${classes.prompt} ${className ?? ''}`}
      style={style}
      // The map pans on a drag: a press in the field is not one
      onPointerDown={(event) => event.stopPropagation()}
    >
      <TextInput
        size="sm"
        aria-label={t('map.branch.field')}
        placeholder={t('map.branch.field')}
        leftSection={<IconFilePlus size={16} stroke={1.5} />}
        value={name}
        autoFocus
        // Keeps Esc here: the drawer would close on it
        data-mantine-stop-propagation
        onChange={(event) => setName(event.currentTarget.value)}
        // Clicking elsewhere on the page closes it; switching to another window does not
        onBlur={() => {
          if (document.hasFocus()) onClose();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!title || isParent) return;
            onSubmit(title, event.metaKey || event.ctrlKey);
            setName('');
          }
        }}
      />
      <Text size="xs" c={isParent ? 'red' : 'dimmed'} mt={6}>
        {note}
      </Text>
    </Paper>
  );
}
