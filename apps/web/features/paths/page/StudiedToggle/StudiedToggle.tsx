'use client';

import { Button, Tooltip } from '@mantine/core';
import { IconClipboardText, IconMessageQuestion, IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';
import { pathProgress } from '@wisepath/domain/paths';
import type { Page, Path, Task } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { showFirstOpenTask } from '../pageTasks';

/** What is left, worded by what it is: only activities, only questions, or both */
const LEFT = {
  activity: { label: 'activity.left', hint: 'activity.leftHint', icon: IconClipboardText },
  question: { label: 'question.left', hint: 'question.leftHint', icon: IconMessageQuestion },
  mixed: { label: 'question.mixedLeft', hint: 'question.mixedHint', icon: IconClipboardText },
} as const;

const leftKind = (open: ReadonlyArray<Task>): keyof typeof LEFT => {
  const kinds = new Set(open.map((task) => task.kind));
  return kinds.size > 1 ? 'mixed' : open[0].kind;
};

interface StudiedToggleProps {
  readonly path: Path;
  readonly page: Page;
  /** What the page asks that its reader has not done (openTasks); in a learning path it holds the mark */
  readonly open: ReadonlyArray<Task>;
  readonly onChange: (studied: boolean) => void;
  /** Shows the page's text, where its activities are, when another tab hides it */
  readonly onShowText: () => void;
}

/**
 * StudiedToggle
 * The page's studied flag, worded as the learner's own statement: an empty
 * box reading "I've studied this" becomes a ticked "Studied". The tooltip
 * says what it changes, so the map's progress never feels arbitrary. While
 * the page's activities or questions are open it says how many are left
 * instead, and takes the learner to the next one: never a disabled button
 * that can't say why.
 */
export function StudiedToggle({ path, page, open, onChange, onShowText }: StudiedToggleProps) {
  const t = useT();

  if (!page.studied && open.length > 0) {
    const { label, hint, icon: Mark } = LEFT[leftKind(open)];
    const showTask = () => {
      onShowText();
      // Once the text's tab shows
      window.requestAnimationFrame(showFirstOpenTask);
    };
    return (
      <Tooltip label={t(hint)} multiline w={260} withArrow>
        <Button variant="default" color="gray" size="xs" onClick={showTask} leftSection={<Mark size={16} stroke={1.8} />}>
          {t(label, { count: open.length })}
        </Button>
      </Tooltip>
    );
  }

  const progress = { map: path.title, ...pathProgress(path) };
  return (
    <Tooltip
      label={t(page.studied ? 'page.studied.unmark' : 'page.studied.mark', { effect: t('page.studied.effectWithProgress', progress) })}
      multiline
      w={260}
      withArrow
    >
      <Button
        variant={page.studied ? 'light' : 'default'}
        color={page.studied ? 'teal' : 'gray'}
        size="xs"
        role="switch"
        aria-checked={page.studied}
        onClick={() => onChange(!page.studied)}
        leftSection={page.studied ? <IconSquareCheckFilled size={16} /> : <IconSquare size={16} stroke={1.8} />}
      >
        {t(page.studied ? 'page.studied.on' : 'page.studied.off')}
      </Button>
    </Tooltip>
  );
}
