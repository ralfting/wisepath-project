import type { ReactNode } from 'react';
import { Box, Group, Text } from '@mantine/core';
import { IconMessageQuestion } from '@tabler/icons-react';
import classes from './QuestionBlock.module.css';

interface QuestionBlockProps {
  readonly label: string;
  /** Its reader wrote an answer: no longer what the studied control points at */
  readonly answered: boolean;
  /** Drawn in place of the icon (the editor's kind menu) */
  readonly marker?: ReactNode;
  /** Under the question, outside its text (the reader's answer field); without a reader there is none */
  readonly answer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A question a page asks its reader, boxed with a speech bubble and the label Question, its words below and, for a
 * reader, their answer under them. Neutral as an activity is, so it reads as a task and not as news.
 */
export function QuestionBlock({ label, answered, marker, answer, children }: QuestionBlockProps) {
  return (
    <Box role="note" aria-label={label} className={classes.root} data-callout="question" data-answered={answered || undefined}>
      {/* Not part of the text: in the editor the cursor never lands in the header or the answer */}
      <Group gap="xs" wrap="nowrap" className={classes.header} contentEditable={false}>
        {marker ?? <IconMessageQuestion size={18} aria-hidden className={classes.icon} />}
        <Text component="span" size="xs" fw={600} className={classes.label}>
          {label}
        </Text>
      </Group>
      <div className={classes.body}>{children}</div>
      {answer ? (
        <div className={classes.answer} contentEditable={false}>
          {answer}
        </div>
      ) : null}
    </Box>
  );
}
