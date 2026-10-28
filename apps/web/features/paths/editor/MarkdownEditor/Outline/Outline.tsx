'use client';

import type { Editor } from '@tiptap/react';
import { Paper, Text, Transition } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import classes from './Outline.module.css';
import { useT } from '@/i18n/I18nProvider';
import type { EditorQuestions } from '../../questions';
import { depthsOf, outlinePlace, unfold } from './Outline.helpers';
import type { OutlineEntry } from './Outline.helpers';
import { OutlineItem } from './OutlineItem';
import { useOutline } from './useOutline';

interface OutlineProps {
  editor: Editor;
  entries: ReadonlyArray<OutlineEntry>;
  /** The reader's answers, to tell an answered question from an open one */
  questions: EditorQuestions | null;
  room: number | null;
  noteOpen: boolean;
}

/**
 * The page's headings, questions and videos. Beside a full page with room on its right they are listed there, by
 * name, a question or a video with its icon under the heading it follows, and stay in view while the text scrolls.
 * Elsewhere they are a quiet rail on the right edge, like Notion's: a dash per heading, longer for higher levels, a
 * dot per question and a small triangle per video, the one being read in blue; hovering (or a tap) opens them by
 * name. A click on a name scrolls to it and puts the cursor there. From the keyboard, Enter or ↓ on the rail goes
 * into the list.
 */
export function Outline({ editor, entries, questions, room, noteOpen }: OutlineProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const place = outlinePlace(room, noteOpen);
  const { railRef, dashesRef, state, operations } = useOutline({ editor, entries });
  const depths = depthsOf(entries);
  const answered = (entry: OutlineEntry) =>
    entry.kind === 'question' && !!questions?.answers.some((answer) => answer.question === questions.ids[entry.index]);
  const listed = place === 'list';

  const list = (
    <>
      <Text component="div" className={classes.outlineTitle} aria-hidden>
        {t('editor.outline.title')}
      </Text>
      <ul className={classes.outlineList}>
        {entries.map((entry, i) => (
          <li key={entry.pos}>
            <OutlineItem
              entry={entry}
              depth={depths[i]}
              active={i === state.active}
              answered={answered(entry)}
              tabbable={!listed || i === state.active}
              onGo={operations.go}
            />
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className={classes.outlineTrack} data-place={place} aria-hidden={false}>
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
            {entries.map((entry, i) => (
              <span
                key={entry.pos}
                className={classes.outlineDash}
                data-kind={entry.kind}
                data-level={depths[i]}
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
