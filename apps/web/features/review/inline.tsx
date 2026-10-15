import type { ReactNode } from 'react';
import { BLANK } from '@wisepath/domain/review';
import classes from './ReviewPage.module.css';

/**
 * A card's text as written in the notes, with its inline markdown shown:
 * `code`, **bold**, *italic*, ==marks==, [[Page]] and [text](url) links (as
 * their words), and a cloze's blank. Anything else shows as written.
 */

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|==([^=]+)==|\[\[([^[\]]+)\]\]|\[([^\]]+)\]\([^)]+\)|(____)/g;

export function InlineText({ text, blank, answer }: { text: string; blank: string; answer?: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${at}`;
    if (m[1] !== undefined) out.push(<code key={key}>{m[1]}</code>);
    else if (m[2] !== undefined) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3] !== undefined || m[4] !== undefined) out.push(<em key={key}>{m[3] ?? m[4]}</em>);
    else if (m[5] !== undefined) out.push(<mark key={key}>{m[5]}</mark>);
    else if (m[6] !== undefined) out.push(m[6]);
    else if (m[7] !== undefined) out.push(m[7]);
    else if (m[8] === BLANK)
      out.push(
        answer === undefined ? (
          <span key={key} className={classes.blank} role="img" aria-label={blank} />
        ) : (
          <mark key={key} className={classes.filled}>
            {answer}
          </mark>
        ),
      );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
