'use client';

import { Paper, Portal, Text, UnstyledButton } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import type { PageLinkPickerState } from '../menus';
import classes from './MarkdownEditor.module.css';
import { placeNear } from './PageNamePrompt';

/**
 * The [[ (or @[[) picker under the cursor: pages to link (or cite), and a page of the typed name to make. In a portal: inside the drawer,
 * its transform would place a fixed popup off screen
 */
export function PageLinkPicker({ picker }: { picker: PageLinkPickerState & { rect: NonNullable<PageLinkPickerState['rect']> } }) {
  const t = useT();
  return (
    <Portal>
      <Paper
        withBorder
        shadow="md"
        py={4}
        role="listbox"
        aria-label={t(picker.kind === 'citation' ? 'editor.picker.citeList' : 'editor.picker.list')}
        className={classes.picker}
        style={placeNear(picker.rect, 256, picker.items.length * 34 + 10)}
      >
        {picker.items.length === 0 ? (
          <Text size="sm" c="dimmed" px="sm" py={6}>
            {t('editor.picker.empty')}
          </Text>
        ) : (
          picker.items.map((item, i) => (
            <UnstyledButton
              key={item.id ?? `new-${item.title}`}
              role="option"
              aria-selected={i === picker.index}
              // Mouse down keeps the editor's focus; click covers keyboards and assistive tech
              onMouseDown={(event) => {
                event.preventDefault();
                picker.select(item);
              }}
              onClick={() => picker.select(item)}
              className={classes.option}
            >
              {item.id ? (
                <span className={classes.starName}>{item.title}</span>
              ) : (
                <Text span size="sm">
                  {t('editor.picker.create')} <span className={classes.starName}>{item.title}</span>
                </Text>
              )}
            </UnstyledButton>
          ))
        )}
      </Paper>
    </Portal>
  );
}
