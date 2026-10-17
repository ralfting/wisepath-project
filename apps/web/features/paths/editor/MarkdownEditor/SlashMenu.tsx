'use client';

import { Paper, Portal, Text, UnstyledButton } from '@mantine/core';
import { IconFilePlus, IconInbox } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import type { SlashMenuState } from '../menus';
import classes from './MarkdownEditor.module.css';
import { SLASH_COMMANDS } from './MarkdownEditor.helpers';
import { placeNear } from './PageNamePrompt';

/** The / commands under the cursor, each with its icon and hint, in a portal like the [[ picker */
export function SlashMenu({ slash }: { slash: SlashMenuState & { rect: NonNullable<SlashMenuState['rect']> } }) {
  const t = useT();
  return (
    <Portal>
      <Paper
        withBorder
        shadow="md"
        py={4}
        role="listbox"
        aria-label={t('editor.slash.list')}
        className={`${classes.picker} ${classes.commands}`}
        style={placeNear(slash.rect, 320, slash.items.length * 36 + 10)}
      >
        {slash.items.map((command, i) => {
          const CommandIcon = command.id === 'inbox' ? IconInbox : (SLASH_COMMANDS.find((c) => c.id === command.id)?.icon ?? IconFilePlus);
          return (
            <UnstyledButton
              key={command.id}
              role="option"
              aria-selected={i === slash.index}
              onMouseDown={(event) => {
                event.preventDefault();
                slash.select(command);
              }}
              onClick={() => slash.select(command)}
              className={classes.command}
            >
              <CommandIcon size={17} stroke={1.5} />
              <span className={classes.commandLabel}>{command.label}</span>
              <Text span size="xs" c="dimmed">
                {command.hint}
              </Text>
            </UnstyledButton>
          );
        })}
      </Paper>
    </Portal>
  );
}
