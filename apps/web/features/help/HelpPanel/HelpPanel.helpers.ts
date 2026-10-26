'use client';

import { createContext } from 'react';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { Screen } from '../screen';
import type { Topic } from './HelpPanel';

export const OPEN_HELP_EVENT = 'wisepath:open-help';

/**
 * Says a clip is shown large. Mantine's drawer and modal both close on Esc from
 * the window, so while a clip is large, Esc closes only it and Help stays
 */
export const EnlargedContext = createContext<(enlarged: boolean) => void>(() => {});

/** What each screen explains, in the order a learner meets it */
export const TOPICS: Record<Screen, { intro: TranslationKey; topics: ReadonlyArray<Topic> }> = {
  page: {
    intro: 'help.page.intro',
    topics: [
      { base: 'help.page.addPage', steps: 3, clip: 'add-page' },
      { base: 'help.page.videoNotes', steps: 4, clip: 'video-notes' },
      { base: 'help.page.callout', steps: 3 },
      { base: 'help.page.activity', steps: 3 },
      { base: 'help.page.moveBranch', steps: 3 },
    ],
  },
  map: {
    intro: 'help.map.intro',
    topics: [
      { base: 'help.map.addBranch', steps: 3, clip: 'map-branch' },
      { base: 'help.map.search', steps: 3, clip: 'map-search' },
      { base: 'help.map.open', steps: 2 },
      { base: 'help.map.keys', steps: 4 },
    ],
  },
  inbox: {
    intro: 'help.inbox.intro',
    topics: [
      { base: 'help.inbox.capture', steps: 3, clip: 'inbox-capture' },
      { base: 'help.inbox.file', steps: 3, clip: 'inbox-file' },
      { base: 'help.inbox.makePage', steps: 3 },
      { base: 'help.inbox.fromPage', steps: 2 },
      { base: 'help.inbox.keys', steps: 4 },
    ],
  },
  home: {
    intro: 'help.home.intro',
    topics: [
      { base: 'help.home.newPath', steps: 3, clip: 'new-path' },
      { base: 'help.home.projects', steps: 3, clip: 'projects' },
      { base: 'help.home.kind', steps: 2 },
    ],
  },
};

export const key = (k: string) => k as TranslationKey;
