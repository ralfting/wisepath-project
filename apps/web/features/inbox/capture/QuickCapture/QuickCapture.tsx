'use client';

import type { PageTarget } from '@/useCases/inbox';
import { useT } from '@/i18n/I18nProvider';
import { Palette } from '@/ui/Palette/Palette';
import { useModEnter } from '../keys';
import { QuickCaptureForm } from './QuickCaptureForm';

/**
 * One field to write something down without choosing where it goes: Enter
 * saves it to the Inbox and closes, Shift+Enter starts a new line, Esc closes
 * without saving. A pasted address is kept with its title, and a YouTube
 * address with a time (?t=) with that moment. Opened over a page, it can add
 * to that page straight away instead.
 */
export function QuickCapture({
  opened,
  onClose,
  page,
  onDone,
}: {
  opened: boolean;
  onClose: () => void;
  /** The page on screen, which can take the text straight away */
  page: PageTarget | null;
  /** Says what happened, once it did */
  onDone: (message: string) => void;
}) {
  const t = useT();
  const modEnter = useModEnter();
  return (
    <Palette opened={opened} onClose={onClose} label={t('inbox.capture.label')} footer={page ? t('inbox.capture.hintOnPage', { keys: modEnter }) : t('inbox.capture.hint')}>
      {/* The palette mounts its content on each opening, so every capture starts blank, headed for the Inbox */}
      <QuickCaptureForm page={page} onClose={onClose} onDone={onDone} />
    </Palette>
  );
}
