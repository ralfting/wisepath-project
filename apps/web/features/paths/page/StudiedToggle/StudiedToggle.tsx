'use client';

import { Button, Tooltip } from '@mantine/core';
import { IconClipboardText, IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';
import { pathProgress } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { pageActivities, showFirstOpenActivity } from '../pageActivities';

interface StudiedToggleProps {
  readonly path: Path;
  readonly page: Page;
  readonly onChange: (studied: boolean) => void;
  /** Shows the page's text, where its activities are, when another tab hides it */
  readonly onShowText: () => void;
}

/**
 * StudiedToggle
 * The page's studied flag, worded as the learner's own statement: an empty
 * box reading "I've studied this" becomes a ticked "Studied". The tooltip
 * says what it changes, so the map's progress never feels arbitrary. While
 * the page's activities are open it says how many are left instead, and
 * takes the learner to the next one: never a disabled button that can't say why.
 */
export function StudiedToggle({ path, page, onChange, onShowText }: StudiedToggleProps) {
  const t = useT();
  const left = page.studied ? 0 : (pageActivities(path, page)?.open ?? 0);

  if (left > 0) {
    const showActivity = () => {
      onShowText();
      // Once the text's tab shows
      window.requestAnimationFrame(showFirstOpenActivity);
    };
    return (
      <Tooltip label={t('activity.leftHint')} multiline w={260} withArrow>
        <Button variant="default" color="gray" size="xs" onClick={showActivity} leftSection={<IconClipboardText size={16} stroke={1.8} />}>
          {t('activity.left', { count: left })}
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
