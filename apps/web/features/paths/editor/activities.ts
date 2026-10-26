'use client';

import { createContext } from 'react';
import type { Node as DocNode } from '@tiptap/pm/model';
import type { ActivityId } from '@wisepath/domain/paths';

/**
 * A page's activities as the editor draws them, given in a learning path: the domain's ids in text order
 * (activitiesIn), the reader's ticks, and how to tick one. Without it an activity has nothing to tick.
 */
export interface EditorActivities {
  readonly ids: ReadonlyArray<ActivityId>;
  readonly done: ReadonlyArray<ActivityId>;
  readonly onToggle: (id: ActivityId) => void;
}

/** Read by each activity's node view; a context and not the extensions' ref, so a tick redraws the blocks at once */
export const EditorActivitiesContext = createContext<EditorActivities | null>(null);

/**
 * How many activity blocks come before a position in the text. The editor never hashes an activity's words: the nth
 * block takes the domain's nth id, so formatting inside one can't make the two disagree
 */
export function activitiesBefore(doc: DocNode, pos: number): number {
  let count = 0;
  doc.descendants((node, at) => {
    if (at >= pos) return false;
    if (node.type.name === 'callout' && node.attrs.kind === 'activity') count++;
    return true;
  });
  return count;
}
