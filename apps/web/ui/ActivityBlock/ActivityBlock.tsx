import type { ReactNode } from 'react';
import { Box, Group, Text } from '@mantine/core';
import { IconClipboardCheck, IconClipboardText } from '@tabler/icons-react';
import classes from './ActivityBlock.module.css';

interface ActivityBlockProps {
  readonly label: string;
  /** Ticked by its reader: teal, with a check. Open, or with nothing to tick, it stays neutral */
  readonly done: boolean;
  /** Drawn in place of the icon (the editor's kind menu) */
  readonly marker?: ReactNode;
  /** At the header's end (Mark as done) */
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Something a page asks the learner to do, boxed with a clipboard and the label Activity, its words below. Neutral
 * while open, so it reads as a task and not as news; teal once done, the colour of progress.
 */
export function ActivityBlock({ label, done, marker, action, children }: ActivityBlockProps) {
  const Mark = done ? IconClipboardCheck : IconClipboardText;
  return (
    <Box role="note" aria-label={label} className={classes.root} data-done={done || undefined} data-callout="activity">
      {/* Not part of the text: in the editor the cursor never lands in the header */}
      <Group gap="xs" wrap="nowrap" className={classes.header} contentEditable={false}>
        {marker ?? <Mark size={18} aria-hidden className={classes.icon} />}
        <Text component="span" size="xs" fw={600} className={classes.label}>
          {label}
        </Text>
        {action ? <div className={classes.action}>{action}</div> : null}
      </Group>
      <div className={classes.body}>{children}</div>
    </Box>
  );
}
