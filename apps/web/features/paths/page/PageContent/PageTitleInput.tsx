'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { titleTaken } from '@wisepath/domain/paths';
import { Textarea } from '@mantine/core';
import { titleSizeFor } from '../titleSize';
import { useT } from '@/i18n/I18nProvider';
import classes from './PageContent.module.css';
import type { PageActions } from './PageContent.helpers';

/**
 * The page title, edited in place. A long one wraps, in a smaller size
 * (titleSize.ts), rather than being cut. Links to the page follow the new name when
 * editing ends. A title another page has would make [[links]] ambiguous, so it
 * shows an error and is not saved; leaving the field then restores the title
 * the page had before editing.
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
  const titleAtFocus = useRef(page.title);
  const [draft, setDraft] = useState(page.title);
  const clash = titleTaken(path, page.id, draft);
  // Gone while still being edited (the drawer moved to another page): the rename ends as a blur would end it
  const editing = useRef(false);
  const latest = useRef({ title: page.title, actions });
  latest.current = { title: page.title, actions };
  useEffect(
    () => () => {
      if (editing.current) latest.current.actions.renameLinks(titleAtFocus.current, latest.current.title);
    },
    [],
  );
  // As tall as its lines: measured again when the title or the field's width changes (a resize can
  // reflow it after the page has laid out, which Mantine's autosize would miss)
  const field = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, [draft, size]);
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Textarea
      ref={field}
      id={`title-${page.id}`}
      variant="unstyled"
      rows={1}
      aria-label={t('page.title.label')}
      value={draft}
      error={clash ? t('page.title.taken') : undefined}
      autoFocus={autoFocus}
      onFocus={() => {
        titleAtFocus.current = page.title;
        editing.current = true;
        actions.beginRename(page.id);
      }}
      onBlur={() => {
        editing.current = false;
        if (clash) {
          setDraft(titleAtFocus.current);
          actions.updatePage(page.id, { title: titleAtFocus.current });
          // Back to the title it had: nothing to rewrite, only the rename to end
          actions.renameLinks(titleAtFocus.current, titleAtFocus.current);
          return;
        }
        actions.renameLinks(titleAtFocus.current, page.title);
      }}
      onChange={(e) => {
        // A title is one line: a pasted line break becomes a space
        const title = e.currentTarget.value.replace(/\s*\n+\s*/g, ' ');
        setDraft(title);
        if (!titleTaken(path, page.id, title)) actions.updatePage(page.id, { title });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      }}
      placeholder={t('page.title.placeholder')}
      classNames={{ input: classes.titleInput }}
      style={{ '--title-size': `${titleSizeFor(size, draft)}px` } as CSSProperties}
    />
  );
}
