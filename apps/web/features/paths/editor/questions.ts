'use client';

import { createContext } from 'react';
import type { Answer, QuestionId } from '@wisepath/domain/paths';

/**
 * A page's questions as the editor draws them, given whenever someone signed in reads the page: the domain's ids in
 * text order (questionsIn), the reader's answers, and how to write one. Without it a question has no answer field.
 */
export interface EditorQuestions {
  readonly ids: ReadonlyArray<QuestionId>;
  readonly answers: ReadonlyArray<Answer>;
  /** A blank body takes the answer away */
  readonly onAnswer: (id: QuestionId, body: string) => void;
}

/** Read by each question's node view; a context and not the extensions' ref, so a saved answer redraws the blocks at once */
export const EditorQuestionsContext = createContext<EditorQuestions | null>(null);
