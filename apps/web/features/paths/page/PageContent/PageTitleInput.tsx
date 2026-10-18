'use client';

import type { CSSProperties } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { mayEditPage } from '@wisepath/domain/paths';
import { Textarea } from '@mantine/core';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageContent.module.css';
import type { PageActions } from './PageContent.helpers';
import { usePageTitleInput } from './usePageTitleInput';

/**
 * The page title, edited in place. A long one wraps, in a smaller size
 * (titleSize.ts), rather than being cut. Links to the page follow the new name when
 * editing ends. A title another page has would make [[links]] ambiguous, so it
 * shows an error and is not saved; leaving the field then restores the title
 * the page had before editing. Someone who may not rename the page reads it.
 */
export function PageTitleInput({
  path,
  page,
  actions,
  autoFocus = false,
  size = 32,
  onEnter,
}: {
  path: Path;
  page: Page;
  actions: Pick<PageActions, 'updatePage' | 'beginRename' | 'renameLinks'>;
  autoFocus?: boolean;
  size?: number;
  onEnter?: () => void;
}) {
  const t = useT();
  const { field, state, operations } = usePageTitleInput({ path, page, actions, size, autoFocus, onEnter });
  return (
    <Textarea
      ref={field}
      id={`title-${page.id}`}
      variant="unstyled"
      rows={1}
      aria-label={t('page.title.label')}
      value={state.draft}
      error={state.clash ? t('page.title.taken') : undefined}
      onFocus={operations.focus}
      onBlur={operations.blur}
      onChange={operations.change}
      onKeyDown={operations.keyDown}
      placeholder={t('page.title.placeholder')}
      readOnly={!mayEditPage(path, page.id, { title: page.title })}
      classNames={{ input: classes.titleInput }}
      style={{ '--title-size': `${state.titleSize}px` } as CSSProperties}
    />
  );
}
