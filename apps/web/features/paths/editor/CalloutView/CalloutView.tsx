'use client';

import { useContext } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Button } from '@mantine/core';
import { IconCheck, IconClipboardCheck, IconSquare } from '@tabler/icons-react';
import type { CalloutKind } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { ActivityBlock } from '@/ui/ActivityBlock/ActivityBlock';
import { QuestionBlock } from '@/ui/QuestionBlock/QuestionBlock';
import { Callout, calloutLook } from '@/ui/Callout/Callout';
import { EditorActivitiesContext } from '../activities';
import { calloutsBefore } from '../callout';
import { EditorQuestionsContext } from '../questions';
import { AnswerField } from './AnswerField/AnswerField';
import { KindMenu } from './KindMenu';

/**
 * CalloutView
 * A callout as the editor shows it: the box with its text editable inside,
 * and its icon a menu that changes its kind or takes the box away, leaving
 * the text where it was. An activity, in a learning path, has Mark as done in
 * its header: the reader's own tick, there in a page they may only read too.
 * A question has the reader's own answer under it, in a study as in a path.
 */
export function CalloutView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const t = useT();
  const activities = useContext(EditorActivitiesContext);
  const questions = useContext(EditorQuestionsContext);
  const kind = node.attrs.kind as CalloutKind; // set only from CALLOUT_KINDS, by the parser and the commands
  const label = t(`editor.callout.kinds.${kind}`);

  const unwrap = () => {
    const at = getPos();
    if (typeof at !== 'number') return;
    editor.chain().focus().setTextSelection({ from: at + 1, to: at + node.nodeSize - 1 }).lift('callout').run();
  };
  const menu = (look: ReturnType<typeof calloutLook>) =>
    editor.isEditable ? <KindMenu kind={kind} label={label} look={look} onPick={(k) => updateAttributes({ kind: k })} onRemove={unwrap} /> : undefined;

  if (kind === 'question') {
    const at = getPos();
    const id = questions && typeof at === 'number' ? questions.ids[calloutsBefore(editor.state.doc, at, 'question')] : undefined;
    const saved = questions?.answers.find((answer) => answer.question === id)?.body ?? '';
    const answer = questions && id !== undefined ? <AnswerField id={id} saved={saved} onAnswer={questions.onAnswer} /> : undefined;
    return (
      <NodeViewWrapper>
        <QuestionBlock label={label} answered={saved !== ''} marker={menu(calloutLook(kind))} answer={answer}>
          <NodeViewContent />
        </QuestionBlock>
      </NodeViewWrapper>
    );
  }

  if (kind !== 'activity') {
    return (
      <NodeViewWrapper>
        <Callout kind={kind} label={label} marker={menu(calloutLook(kind))}>
          <NodeViewContent />
        </Callout>
      </NodeViewWrapper>
    );
  }

  const at = getPos();
  const id = activities && typeof at === 'number' ? activities.ids[calloutsBefore(editor.state.doc, at, 'activity')] : undefined;
  const done = id !== undefined && !!activities?.done.includes(id);
  const tick =
    activities && id !== undefined ? (
      <Button
        size="compact-xs"
        variant={done ? 'light' : 'default'}
        color={done ? 'teal' : 'gray'}
        role="switch"
        aria-checked={done}
        leftSection={done ? <IconCheck size={14} /> : <IconSquare size={14} stroke={1.8} />}
        onClick={() => activities.onToggle(id)}
      >
        {t(done ? 'activity.done' : 'activity.markDone')}
      </Button>
    ) : undefined;

  return (
    <NodeViewWrapper>
      <ActivityBlock label={label} done={done} marker={menu(done ? { color: 'teal', icon: IconClipboardCheck } : calloutLook(kind))} action={tick}>
        <NodeViewContent />
      </ActivityBlock>
    </NodeViewWrapper>
  );
}
