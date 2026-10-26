'use client';

import type { Editor } from '@tiptap/react';
import { Paper, Text, Transition, UnstyledButton } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import classes from '../MarkdownEditor.module.css';
import { useT } from '@/i18n/I18nProvider';
import { unfold } from './Outline.helpers';
import type { Heading } from './Outline.helpers';
import { useOutline } from './useOutline';

/**
 * The page's headings. Beside a full page with room on its right they are listed there, by name, and stay in view
 * while the text scrolls. Elsewhere they are a quiet rail of dashes on the right edge, like Notion's: one dash per
 * heading, longer for higher levels, the one being read in blue; hovering (or a tap) opens the headings by name.
 * A click on a name scrolls to its heading and puts the cursor at its end. From the keyboard, Enter or ↓ on the
 * dashes goes into the list.
 */
export function Outline({ editor, headings, noteOpen }: { editor: Editor; headings: ReadonlyArray<Heading>; noteOpen: boolean }) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { railRef, dashesRef, state, operations } = useOutline({ editor, headings, noteOpen });
  const listed = state.place === 'list';

  const list = (
    <>
      <Text component="div" className={classes.outlineTitle} aria-hidden>
        {t('editor.outline.title')}
      </Text>
      <ul className={classes.outlineList}>
        {headings.map((h, i) => (
          <li key={h.pos}>
            <UnstyledButton
              data-outline-item
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => operations.go(h)}
              className={classes.outlineItem}
              data-level={Math.min(h.level - state.top, 2)}
              data-active={i === state.active || undefined}
              aria-current={i === state.active ? 'location' : undefined}
              title={h.text}
            >
              <span className={classes.outlineText}>{h.text}</span>
            </UnstyledButton>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className={classes.outlineTrack} data-place={state.place} aria-hidden={false}>
      {listed ? (
        <nav ref={railRef} aria-label={t('editor.outline.label')} className={classes.outline} onKeyDown={operations.keyDown}>
          <div className={classes.outlineListed}>{list}</div>
        </nav>
      ) : (
        <nav
          ref={railRef}
          aria-label={t('editor.outline.label')}
          className={classes.outline}
          data-open={state.open || undefined}
          onMouseEnter={operations.open}
          onMouseLeave={operations.close}
          onFocus={operations.focusIn}
          onKeyDown={operations.keyDown}
          onBlur={operations.focusOut}
        >
          <button
            ref={dashesRef}
            type="button"
            className={classes.outlineDashes}
            onPointerDown={operations.pressDashes}
            onClick={operations.clickDashes}
            aria-label={t('editor.outline.label')}
            aria-expanded={state.open}
          >
            {headings.map((h, i) => (
              <span
                key={h.pos}
                className={classes.outlineDash}
                data-level={Math.min(h.level - state.top, 2)}
                data-active={i === state.active || undefined}
              />
            ))}
          </button>
          <Transition mounted={state.open} transition={unfold} duration={reduceMotion ? 0 : 140} exitDuration={reduceMotion ? 0 : 90} timingFunction="ease-out">
            {(style) => (
              <div className={classes.outlinePop} style={style}>
                <Paper className={classes.outlinePanel}>{list}</Paper>
              </div>
            )}
          </Transition>
        </nav>
      )}
    </div>
  );
}
