import type { ReactNode } from 'react';
import classes from './QuestionBlock.module.css';

interface QuestionBlockProps {
  /** The kind's name, read out with the block; nothing shows it */
  readonly label: string;
  /** Its reader wrote an answer: no longer what the studied control points at */
  readonly answered: boolean;
  /** Under the question, outside its text (the reader's answer field); without a reader there is none */
  readonly answer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A question a page asks its reader: its words as the page's own blocks, a heading or a paragraph as written, and
 * for a reader their answer under them. No box: the answer field is what says it is a question.
 */
export function QuestionBlock({ label, answered, answer, children }: QuestionBlockProps) {
  return (
    <div role="note" aria-label={label} className={classes.root} data-callout="question" data-answered={answered || undefined}>
      {children}
      {answer ? (
        // Not part of the text: in the editor the cursor never lands in the answer
        <div className={classes.answer} contentEditable={false}>
          {answer}
        </div>
      ) : null}
    </div>
  );
}
