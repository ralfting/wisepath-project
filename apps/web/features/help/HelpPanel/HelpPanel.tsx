'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Drawer } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import { screenOf } from '../screen';
import { Topics } from './Topics';
import { EnlargedContext, OPEN_HELP_EVENT } from './HelpPanel.helpers';

/**
 * HelpPanel
 * What can I do here: topics for the screen the learner is on (a page, a map,
 * My paths), opened from Help in the sidebar. Most show a short clip of the
 * app doing it, with captions, in the app's language (public/help/, made with
 * HyperFrames from recordings of the app: videos/help-*).
 */

export function openHelp(): void {
  window.dispatchEvent(new Event(OPEN_HELP_EVENT));
}

export function HelpPanel({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const t = useT();
  const screen = screenOf(pathname);
  const [enlarged, setEnlarged] = useState(false);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      // Above the page drawer (Mantine's 200, expanded too), the floating sidebar (220) and the line's key tag (250)
      zIndex={260}
      // The drawer's title is already a heading (h2)
      title={t('help.title')}
      styles={{ title: { fontSize: 'var(--mantine-font-size-xl)', fontWeight: 700 } }}
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
      closeOnEscape={!enlarged}
    >
      <EnlargedContext.Provider value={setEnlarged}>
        <Topics key={screen} screen={screen} />
      </EnlargedContext.Provider>
    </Drawer>
  );
}

/** A topic of Help: its steps and tip (help.<screen>.<topic>.*), and the clip that shows it (public/help/<clip>.<locale>.mp4) when there is one */
export interface Topic {
  /** Its messages: <base>.title, <base>.steps.a…, <base>.tip */
  readonly base: string;
  readonly steps: number;
  readonly clip?: string;
}
