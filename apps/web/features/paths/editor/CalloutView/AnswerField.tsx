'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Textarea } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { MAX_ANSWER } from '@wisepath/domain/paths';
import type { QuestionId } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';

/** Typing pauses this long before an answer is saved; leaving the field saves at once */
const ANSWER_SAVE_MS = 600;

interface AnswerFieldProps {
  readonly id: QuestionId;
  /** The reader's saved answer; empty when they have none */
  readonly saved: string;
  readonly onAnswer: (id: QuestionId, body: string) => void;
}

/** Keys typed in the answer are the field's, not the page text's; Tab and Escape still move focus and close panels */
const keepKeys = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' && event.key !== 'Escape') event.stopPropagation();
};

/**
 * AnswerField
 * The reader's own answer to a question, under it: plain text that grows as it is written and saves by itself, as
 * the reader pauses and when they leave the field. Clearing it takes the answer away.
 */
export function AnswerField({ id, saved, onAnswer }: AnswerFieldProps) {
  const t = useT();
  const [value, setValue] = useState(saved);
  const [focused, setFocused] = useState(false);
  const [seen, setSeen] = useState(saved);
  // Changed elsewhere (another device, the page read again): taken in unless the reader is writing here
  if (saved !== seen) {
    setSeen(saved);
    if (!focused) setValue(saved);
  }

  const save = useDebouncedCallback(
    (body: string) => {
      const answer = body.trim() === '' ? '' : body;
      if (answer !== saved) onAnswer(id, answer);
    },
    { delay: ANSWER_SAVE_MS, flushOnUnmount: true },
  );

  return (
    <Textarea
      label={t('question.answer')}
      placeholder={t('question.placeholder')}
      value={value}
      onChange={(event) => {
        setValue(event.currentTarget.value);
        save(event.currentTarget.value);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        save.flush();
      }}
      onKeyDown={keepKeys}
      autosize
      minRows={2}
      maxLength={MAX_ANSWER}
    />
  );
}
