'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Page, Path } from '@wisepath/domain/paths';
import { asTitle, titleTaken } from '@wisepath/domain/paths';
import { titleSizeFor } from '../titleSize';
import type { PageActions } from './PageContent.helpers';

/**
 * The page title's view model: the draft, whether another page has that title, the size it is shown in, the field
 * kept as tall as its lines, and the rename (links follow the new title when editing ends; a clash goes back).
 */
export function usePageTitleInput({
  path,
  page,
  actions,
  size,
  autoFocus,
  onEnter,
}: {
  path: Path;
  page: Page;
  actions: Pick<PageActions, 'updatePage' | 'beginRename' | 'renameLinks'>;
  size: number;
  autoFocus: boolean;
  onEnter?: () => void;
}) {
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
  const field = useFitToLines(draft, size);
  // After a frame, not on mount: the drawer and the editor settle their own focus first, and the title must win
  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, field]);

  const focus = () => {
    titleAtFocus.current = page.title;
    editing.current = true;
    actions.beginRename(page.id);
  };
  const blur = () => {
    editing.current = false;
    if (clash) {
      setDraft(titleAtFocus.current);
      actions.updatePage(page.id, { title: titleAtFocus.current });
      // Back to the title it had: nothing to rewrite, only the rename to end
      actions.renameLinks(titleAtFocus.current, titleAtFocus.current);
      return;
    }
    actions.renameLinks(titleAtFocus.current, page.title);
  };
  const change = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const title = asTitle(event.currentTarget.value);
    setDraft(title);
    if (!titleTaken(path, page.id, title)) actions.updatePage(page.id, { title });
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onEnter?.();
    }
  };

  return { field, state: { draft, clash, titleSize: titleSizeFor(size, draft) }, operations: { focus, blur, change, keyDown } };
}

/**
 * A textarea as tall as its lines: measured again when the text or the size changes, and when its width does (a
 * resize can reflow it after the page has laid out, which Mantine's autosize would miss)
 */
function useFitToLines(text: string, size: number) {
  const field = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, [text, size]);
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
  return field;
}
