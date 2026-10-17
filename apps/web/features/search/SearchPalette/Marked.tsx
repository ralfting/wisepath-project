'use client';

import type { ReactNode } from 'react';
import type { Mark } from '@wisepath/domain/search';
import classes from './SearchPalette.module.css';

/** The text with what matched marked */
export function Marked({ text, marks }: { text: string; marks: ReadonlyArray<Mark> }) {
  if (marks.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [start, end] of marks) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className={classes.mark}>
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
