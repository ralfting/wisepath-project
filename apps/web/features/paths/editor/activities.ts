'use client';

import { createContext } from 'react';
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
